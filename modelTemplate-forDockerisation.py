#!pip install boto3 matplotlib torch torchvision scikit-learn neo4j onnx
import shutil
import os
import boto3
import neo4j
from neo4j import GraphDatabase

from torchvision import transforms
from torch.utils.data import Dataset, DataLoader, random_split
from PIL import Image, ImageDraw
import json
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from sklearn.metrics import confusion_matrix, roc_curve, auc, precision_recall_fscore_support, accuracy_score

import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
import torch.onnx

import matplotlib.image as mpimg
import joblib
import onnx

import pickle
import inspect

def delete_all_files_in_directory(directory_path):
    if os.path.exists(directory_path):
        shutil.rmtree(directory_path)
        os.makedirs(directory_path)  # Recreate the directory after deletion

def get_bounding_boxes():
    bounding_boxes = {}
    with driver.session() as session:
        result = session.run(
            """
MATCH (i:Image)<-[b:Labelled]-(u)
WHERE i.folderName = 'birds' AND b.isActive = true
AND b.category IN ['egret','kingfisher']
RETURN i.fileName AS fileName, b.category AS category,
b.x AS x, b.y AS y, b.width AS width, b.height AS height
            """)

        for record in result:
            file_name = record['fileName']
            category = record['category']
            bbox = {
                'category': category,
                'x': record['x'],
                'y': record['y'],
                'width': record['width'],
                'height': record['height']
            }
            if file_name not in bounding_boxes:
                bounding_boxes[file_name] = []
            bounding_boxes[file_name].append(bbox)

        result2 = session.run(
            """
MATCH (m:Model)
WHERE m.name = $modelName
SET m.status = 'R', m.UpdatedOn = datetime(), m.RunStartedOn = datetime()
RETURN m.name AS modelName, m.status AS status, m.UpdatedOn AS updatedOn
            """,
            { "modelName": modelName })

    return bounding_boxes

def download_images_from_s3():
    response = s3.list_objects_v2(Bucket=s3_trainBucket, Prefix=s3_folder)
    downloadedImagesCount = 0

    for obj in response.get('Contents', []):
        key = obj['Key']
        if key not in image_keys:
            continue
        local_path = os.path.join(local_folder, os.path.basename(key))
        s3.download_file(s3_trainBucket, key, local_path)
        downloadedImagesCount += 1

    print(downloadedImagesCount)



class CustomDataset(Dataset):
    def __init__(self, image_folder, bounding_boxes, transform=None):
        self.image_folder = image_folder
        self.bounding_boxes = bounding_boxes
        self.transform = transform

        # Extract unique categories
        unique_categories = extract_unique_categories(bounding_boxes)

        # Create category-to-index mapping
        self.category_index_mapping = create_category_index_mapping(unique_categories)

        # Create index-to-category mapping
        self.index_category_mapping = create_index_category_mapping(self.category_index_mapping)

        # Convert categories to indices
        self.bounding_boxes = convert_categories_to_indices(bounding_boxes, self.category_index_mapping)

    def __len__(self):
        return len(self.bounding_boxes)

    def __getitem__(self, index):
        img_name = list(self.bounding_boxes.keys())[index]
        img_path = os.path.join(self.image_folder, img_name)
        image = Image.open(img_path).convert('RGB')
        boxes = self.bounding_boxes.get(img_name, [])

        if self.transform:
            image = self.transform(image)

        # Extract bounding box coordinates with index
        box_coords = []
        for box in boxes:
            box_coords.append([box['x'], box['y'], box['width'], box['height'], box['category']])

        # Convert to tensors using clone().detach()
        image_tensor = image if isinstance(image, torch.Tensor) else transforms.ToTensor()(image).clone().detach()
        boxes_tensor = torch.tensor(box_coords, dtype=torch.float32).clone().detach()

        return image_tensor, boxes_tensor

    def convert_indices_to_labels(self):
        # Create index-to-category mapping
        index_category_mapping = create_index_category_mapping(self.category_index_mapping)
        # Convert indices back to category labels
        self.bounding_boxes = convert_indices_to_categories(self.bounding_boxes, index_category_mapping)

# Helper functions
def extract_unique_categories(bounding_boxes):
    unique_categories = set()
    for boxes in bounding_boxes.values():
        for box in boxes:
            unique_categories.add(box['category'])
    return list(unique_categories)

def create_category_index_mapping(unique_categories):
    return {category: index for index, category in enumerate(unique_categories)}

def create_index_category_mapping(category_index_mapping):
    return {index: category for category, index in category_index_mapping.items()}

def convert_categories_to_indices(bounding_boxes, category_index_mapping):
    for boxes in bounding_boxes.values():
        for box in boxes:
            box['category'] = category_index_mapping[box['category']]
    return bounding_boxes

def convert_indices_to_categories(bounding_boxes, index_category_mapping):
    for boxes in bounding_boxes.values():
        for box in boxes:
            box['category'] = index_category_mapping[box['category']]
    return bounding_boxes



class SingleLabelDataset(Dataset):
    def __init__(self, base_dataset):
        self.base_dataset = base_dataset
        self.single_label_data = []

        # Create a list of (image_index, label_index) pairs
        for img_idx in range(len(base_dataset)):
            _, labels = base_dataset[img_idx]
            for label_idx in range(len(labels)):
                self.single_label_data.append((img_idx, label_idx))

    def __len__(self):
        return len(self.single_label_data)

    def __getitem__(self, index):
        img_idx, label_idx = self.single_label_data[index]
        image, labels = self.base_dataset[img_idx]
        single_label = labels[label_idx]
        return image, single_label



def show_image_without_boxes(dataset, index):
    # Get the image from the dataset
    image_tensor, _ = dataset[index]

    # Convert the image tensor to a numpy array for display
    image = image_tensor.permute(1, 2, 0).numpy()  # Change from (C, H, W) to (H, W, C)

    # Unnormalize the image
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    image = image * std + mean

    # Clip the values to be in the range [0, 1]
    image = np.clip(image, 0, 1)

    # Display the image
    plt.imshow(image)
    plt.axis('off')
    plt.show()

def show_image_with_boxes(dataset, index):
    # Get the image and bounding box from the dataset
    image_tensor, bounding_box_tensor = dataset[index]

    # Convert the image tensor to a numpy array for display
    image = image_tensor.permute(1, 2, 0).numpy()  # Change from (C, H, W) to (H, W, C)
    boxes = bounding_box_tensor.numpy()

    # Unnormalize the image
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    image = image * std + mean

    # Clip the values to be in the range [0, 1]
    image = np.clip(image, 0, 1)

    # Convert the image to a PIL image
    image_pil = Image.fromarray((image * 255).astype(np.uint8))

    # Draw the bounding boxes and category labels
    draw = ImageDraw.Draw(image_pil)
    for box in boxes:
        x = box[0] * image_pil.width
        y = box[1] * image_pil.height
        width = box[2] * image_pil.width
        height = box[3] * image_pil.height
        category_index = int(box[4])  # Assuming the category index is the 5th element in the box array
        print(category_index)
        print(dataset.index_category_mapping)
        print(dataset.category_index_mapping)
        category_label = dataset.index_category_mapping[category_index]

        # Draw the bounding box
        draw.rectangle([x, y, x + width, y + height], outline="red", width=2)

        # Draw the category label
        draw.text((x, y), category_label + ' (' + str(category_index) + ')', fill="red")

    # Display the image with bounding boxes and labels
    plt.imshow(image_pil)
    plt.axis('off')
    plt.show()



class MultiTaskCNN(nn.Module):
    def __init__(self, num_classes):
        super(MultiTaskCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(in_channels=3, out_channels=16, kernel_size=3, padding=1, stride=1),
            nn.ELU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(in_channels=16, out_channels=32, kernel_size=3, padding=1, stride=1),
            nn.ELU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(in_channels=32, out_channels=64, kernel_size=3, padding=1, stride=1),
            nn.ELU(),
            nn.MaxPool2d(2, 2),
            nn.Conv2d(in_channels=64, out_channels=128, kernel_size=3, padding=1, stride=1),
            nn.ELU(),
            nn.MaxPool2d(2, 2),
            nn.Flatten(),
            nn.Linear(128 * 8 * 8, 128),  # Corrected input size for 128x128 input images
            nn.ELU()
        )
        self.fc_coords = nn.Linear(128, 4)  # For X, Y, width, height
        self.fc_class = nn.Linear(128, num_classes)  # For category index

    def forward(self, x):
        x = self.features(x)
        coords = self.fc_coords(x)
        class_logits = self.fc_class(x)
        return coords, class_logits



# Training function
def train_model(model, data_loader, criterion_coords, criterion_class, optimizer, num_epochs=15):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.train()
    for epoch in range(num_epochs):
        running_loss = 0.0
        for inputs, targets in data_loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            optimizer.zero_grad()
            coords_pred, class_logits = model(inputs)

            # Split targets into coordinates and class index
            coords_target = targets[:, :4].float()  # X, Y, width, height
            class_target = targets[:, 4].long()  # Category index

            # Compute individual losses
            loss_coords = criterion_coords(coords_pred, coords_target)
            loss_class = criterion_class(class_logits, class_target)

            # Combine losses
            print('loss_coords: ' + str(loss_coords))
            print('loss_class: ' + str(loss_class))
            total_loss = 0.5 * loss_coords + 0.5 * loss_class

            total_loss.backward()
            optimizer.step()

            running_loss += total_loss.item() * inputs.size(0)

        epoch_loss = running_loss / len(data_loader.dataset)
        print(f'Epoch {epoch}/{num_epochs - 1}, Loss: {epoch_loss:.4f}')

    return model



# Evaluation function
def evaluate_model(model, data_loader, criterion_coords, criterion_class, modelName, filePathConfusionMatrix, filePathRocCurve):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    model.eval()

    total_loss = 0.0
    total_samples = 0
    all_coords_pred = []
    all_coords_target = []
    all_class_pred = []
    all_class_target = []

    with torch.no_grad():
        for inputs, targets in data_loader:
            inputs = inputs.to(device)
            targets = targets.to(device)

            coords_pred, class_logits = model(inputs)

            # Split targets into coordinates and class index
            coords_target = targets[:, :4].float()  # X, Y, width, height
            class_target = targets[:, 4].long()  # Category index

            # Compute individual losses
            loss_coords = criterion_coords(coords_pred, coords_target)
            loss_class = criterion_class(class_logits, class_target)

            # Collect predictions and targets
            all_coords_pred.append(coords_pred.cpu().numpy())
            all_coords_target.append(coords_target.cpu().numpy())
            _, predicted_classes = torch.max(class_logits, 1)
            all_class_pred.append(predicted_classes.cpu().numpy())
            all_class_target.append(class_target.cpu().numpy())

            total_samples += inputs.size(0)

            # Visualize the images with bounding boxes and labels
            for i in range(inputs.size(0)):
                img = inputs[i].cpu().numpy().transpose((1, 2, 0))
                img = (img - img.min()) / (img.max() - img.min())  # Normalize to [0, 1]

                fig, ax = plt.subplots(1)
                ax.imshow(img)

                # Draw ground truth bounding box
                gt_coords = coords_target[i].cpu().numpy()
                gt_label = class_target[i].item()
                rect = patches.Rectangle((gt_coords[0] * img.shape[1], gt_coords[1] * img.shape[0]),
                                         gt_coords[2] * img.shape[1], gt_coords[3] * img.shape[0],
                                         linewidth=2, edgecolor='g', facecolor='none')
                ax.add_patch(rect)
                plt.text(gt_coords[0] * img.shape[1], gt_coords[1] * img.shape[0] - 10, f'GT: {gt_label}', color='g', fontsize=12, weight='bold')

                # Draw predicted bounding box
                pred_coords = coords_pred[i].cpu().numpy()
                pred_label = predicted_classes[i].item()
                rect = patches.Rectangle((pred_coords[0] * img.shape[1], pred_coords[1] * img.shape[0]),
                                         pred_coords[2] * img.shape[1], pred_coords[3] * img.shape[0],
                                         linewidth=2, edgecolor='r', facecolor='none')
                ax.add_patch(rect)
                plt.text(pred_coords[0] * img.shape[1], pred_coords[1] * img.shape[0] - 30, f'Pred: {pred_label}', color='r', fontsize=12, weight='bold')

                plt.show()

    avg_loss = total_loss / total_samples
    all_coords_pred = np.vstack(all_coords_pred)
    all_coords_target = np.vstack(all_coords_target)
    all_class_pred = np.hstack(all_class_pred)
    all_class_target = np.hstack(all_class_target)

    # Calculate RMSE for bounding-box coordinates
    rmse = np.sqrt(np.mean((all_coords_pred - all_coords_target) ** 2))

    # Calculate classification metrics
    accuracy = accuracy_score(all_class_target, all_class_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(all_class_target, all_class_pred, average='weighted')

    # Handle the case where there is only one class in the data
    unique_labels = np.unique(np.concatenate((all_class_target, all_class_pred)))
    cm = confusion_matrix(all_class_target, all_class_pred, labels=unique_labels)

    if cm.shape == (1, 1):
        tn, fp, fn, tp = 0, 0, 0, cm[0, 0]
    else:
        tn, fp, fn, tp = cm.ravel()

    false_positive_rate = fp / (fp + tn) if (fp + tn) > 0 else 0

    # Format variables to 4 significant figures
    formatted_accuracy = f"{accuracy:.5g}"
    formatted_precision = f"{precision:.5g}"
    formatted_recall = f"{recall:.5g}"
    formatted_false_positive_rate = f"{false_positive_rate:.5g}"
    formatted_f1 = f"{f1:.5g}"
    formatted_rmse = f"{rmse:.5g}"
    formatted_avg_loss = f"{avg_loss:.5g}"

    # Log metrics to console
    print(f'Average Loss: {formatted_avg_loss}')
    print(f'RMSE (Bounding Box): {formatted_rmse}')
    print(f'Accuracy: {formatted_accuracy}')
    print(f'Precision: {formatted_precision}')
    print(f'Recall: {formatted_recall}')
    print(f'False Positive Rate: {formatted_false_positive_rate}')
    print(f'F1 Score: {formatted_f1}')

    with driver.session() as session:

        result3 = session.run(
                """
    MATCH (m:Model)
    WHERE m.name = $modelName
    SET m.status = 'R', m.UpdatedOn = datetime(),
    m.evalAccuracy = $accuracy, m.evalPrecision = $precision, m.evalRecall = $recall,
    m.evalFalsePositiveRate = $falsePositiveRate, m.evalF1Score = $f1Score,
    m.evalRmse = $rmse, m.evalAvgLoss = $avgLoss
    RETURN m.name AS modelName, m.status AS status, m.UpdatedOn AS updatedOn
                """,
        {
            "modelName": modelName,
            "accuracy": formatted_accuracy,
            "precision": formatted_precision,
            "recall": formatted_recall,
            "falsePositiveRate": formatted_false_positive_rate,
            "f1Score": formatted_f1,
            "rmse": formatted_rmse,
            "avgLoss": formatted_avg_loss
        })

    # Plot confusion matrix
    plt.figure(figsize=(10, 7))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')

    plt.savefig(filePathConfusionMatrix)

    plt.show()

    # Plot ROC curve
    if len(unique_labels) > 1:
        fpr, tpr, _ = roc_curve(all_class_target, all_class_pred, pos_label=unique_labels[1])
        roc_auc = auc(fpr, tpr)
        plt.figure()
        plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (area = {roc_auc:.2f})')
        plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
        plt.xlim([0.0, 1.0])
        plt.ylim([0.0, 1.05])
        plt.xlabel('False Positive Rate')
        plt.ylabel('True Positive Rate')
        plt.title('Receiver Operating Characteristic')
        plt.legend(loc='lower right')

        plt.savefig(filePathRocCurve)

        plt.show()



try:
    # Create local directory if it doesn't exist
    local_folder = 'local_data'
    if not os.path.exists(local_folder):
        os.makedirs(local_folder)

    delete_all_files_in_directory(local_folder)

    # Set up AWS credentials and S3 client
    s3 = boto3.client('s3', aws_access_key_id='AKIAXIxxxxxxxxxxxxx', aws_secret_access_key='wH74YaSxxxxxxxxxxxxx', region_name='ap-southeast-1')
    s3_trainBucket = 'dsai-imageuploads'
    s3_evalBucket = 'dsai-modelevaluations'
    s3_modelBucket = 'dsai-modelstates'
    modelName = 'UnusableJob_yeojeanvia@gmail.com_2024-10-05-18:21:29_M5'
    filePathConfusionMatrix = '/tmp/confusion-matrix.png'
    filePathRocCurve = '/tmp/roc-curve.png'
    filePathModel = '/tmp/model.onnx'
    filePathModelClassDefinition = '/tmp/model-class-definition.py'
    filePathModelStateDict = '/tmp/model-state-dict.pth'
    s3_folder = 'birds'

    # Set up Neo4j connection
    neo4j_uri = 'neo4j://xxxxxxxxxxxxx.ap-southeast-1.compute.amazonaws.com:7687'
    neo4j_user = 'neo4j'
    neo4j_password = 'panther-xxxxxxxxxxxxx'
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    bounding_boxes = get_bounding_boxes()

    image_keys = [s3_folder + '/' + s for s in bounding_boxes.keys()]
    download_images_from_s3()

    # Define data transformations
    data_transforms = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    # Create the custom dataset
    dataset = CustomDataset(local_folder, bounding_boxes, transform=data_transforms)

    # Define the lengths for training and evaluation sets
    train_size = int(0.8 * len(dataset))
    eval_size = len(dataset) - train_size

    # Split the dataset
    train_dataset, eval_dataset = random_split(dataset, [train_size, eval_size])

    # Create DataLoaders
    train_loader = DataLoader(SingleLabelDataset(train_dataset), batch_size=32, shuffle=True, num_workers=4)
    eval_loader = DataLoader(SingleLabelDataset(eval_dataset), batch_size=32, shuffle=False, num_workers=4)

    show_image_without_boxes(dataset, index=0)
    show_image_with_boxes(dataset, index=0)

    # Initialize the model, loss function, and optimizer
    num_classes = len(dataset.category_index_mapping)
    model = MultiTaskCNN(num_classes)
    criterion_coords = nn.MSELoss()
    criterion_class = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    # Train the model
    trained_model = train_model(model, train_loader, criterion_coords, criterion_class, optimizer, num_epochs=20)

    # Evaluate the model
    evaluate_model(model, eval_loader, criterion_coords, criterion_class, modelName, filePathConfusionMatrix, filePathRocCurve)

    # Upload confusion matrix and roc curve
    s3.upload_file(filePathConfusionMatrix, s3_evalBucket, modelName+'-ConfusionMatrix.png')
    if os.path.exists(filePathRocCurve):
        s3.upload_file(filePathRocCurve, s3_evalBucket, modelName+'-RocCurve.png')
    else:
        print(f"File {filePathRocCurve} does not exist in the filepath.")

    # Upload model
    #joblib.dump(model, filePathTrainedModel)
    #s3.upload_file(filePathTrainedModel, s3_modelBucket, modelName+'-TrainedModel.pkl')
    dummy_input, _ = next(iter(eval_loader))
    # Modify dummy_input to have the shape [1, 3, 128, 128]
    dummy_input = dummy_input[0:1, :, :]  # Select the first sample only instead of batch size
    
    # Set the model to evaluation mode
    model.eval()
    
    #torch.onnx.export(model, dummy_input, filePathModel, export_params=True, opset_version=11, do_constant_folding=True, input_names=['input'], output_names=['coords_pred', 'class_logits'])
    #s3.upload_file(filePathModel, s3_modelBucket, modelName+'-model.onnx')

    with open(filePathModel, 'wb') as f:
        pickle.dump(model, f)
    s3.upload_file(filePathModel, s3_modelBucket, modelName+'-model.pkl')

    # Save the model state dictionary
    torch.save(model.state_dict(), filePathModelStateDict)
    s3.upload_file(filePathModelStateDict, s3_modelBucket, modelName+'-model-state-dict.pth')

    # Save the class definition to a .py file using inspect
    # class_definition = inspect.getsource(MultiTaskCNN)
    # with open(filePathModelClassDefinition, 'w') as f:
    #     f.write(class_definition)
    # s3.upload_file(filePathModelClassDefinition, s3_modelBucket, modelName + '-ClassDefinition.py')

    # Convert categories dictionary to two lists
    keys_list = list(dataset.index_category_mapping.keys())
    values_list = list(dataset.index_category_mapping.values())

except Exception as e:
    print(f"An error occurred: {e}")

    # Update Model node with status E (Error)
    with driver.session() as session:

        result3 = session.run(
                """
    MATCH (m:Model)
    WHERE m.name = $modelName
    SET m.status = 'E', m.UpdatedOn = datetime(), m.exception = $exception
    RETURN m.name AS modelName, m.status AS status, m.UpdatedOn AS updatedOn
                """,
                { "modelName" : modelName, "exception" : str(e) })

else:
    print("Completed Successfully!")

    # Update Model node with status C (Completed)
    with driver.session() as session:

        result3 = session.run(
                """
    MATCH (m:Model)
    WHERE m.name = $modelName
    SET m.status = 'C', m.UpdatedOn = datetime(), m.CompletedOn = datetime(),
    m.classifierKeys = $keysList, m.classifierCategories = $valuesList,
    m.classifierTrainFolder = $folderName
    RETURN m.name AS modelName, m.status AS status, m.UpdatedOn AS updatedOn
                """,
                {
                    "modelName" : modelName,
                    "keysList": keys_list,
                    "valuesList": values_list,
                    "folderName": s3_folder
                })


