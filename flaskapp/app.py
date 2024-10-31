# pip freeze > requirements.txt
# pip install -r requirements.txt

# set FLASK_ENV=development                    if using Windows Command Prompt
# $env:FLASK_ENV="development"                 if using PowerShell
# $env:FLASK_DEBUG="1"                         if using PowerShell

# python -m flask run
""" 
kubectl apply -f flask-deployment.yaml
kubectl apply -f flask-hpa.yaml
kubectl apply -f flask-service.yaml
kubectl apply -f ingress.yaml 
"""

import os
import zipfile
from flask import Flask, request, redirect, url_for, render_template, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

import boto3
from neo4j import GraphDatabase

import base64
import io
import importlib.util
import inspect
import sys
import pickle
import joblib
import numpy as np
from PIL import Image

import torch
import torchvision.transforms as transforms

app = Flask(__name__)
CORS(app)  # This will enable CORS for all routes
#CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})  # This will enable CORS for /api routes only

@app.route('/flask/')
def hello_world():
    return render_template('index.html')

# AWS credentials
aws_access_key_id = 'AKIAXIxxxxxxxxxxxxx'
aws_secret_access_key = 'wH74YaSxxxxxxxxxxxxx'
aws_region = 'ap-southeast-1'
# Initialize S3 client with explicit credentials
s3 = boto3.client(
    's3',
    aws_access_key_id=aws_access_key_id,
    aws_secret_access_key=aws_secret_access_key,
    region_name=aws_region
)
modelBucketName = 'dsai-modelstates'

# Initialize Neo4j driver
neo4j_driver = GraphDatabase.driver(
    "neo4j://xxxxxxxxxxxxx.ap-southeast-1.compute.amazonaws.com:7687", 
    auth=("neo4j", "panther-xxxxxxxxxxxxx"))

def download_and_import_class_from_s3(bucket_name, key, class_name):
    print(f"Class Def S3 Key: {key}")  # Print the key for debugging
    
    # Download the Python file from S3
    response = s3.get_object(Bucket=bucket_name, Key=key)
    python_file_content = response['Body'].read().decode('utf-8')

    # Save the Python file locally
    local_file_path = '/tmp/temp_class_file.py'
    with open(local_file_path, 'w') as f:
        f.write(python_file_content)

    # Dynamically import the class from the downloaded Python file
    spec = importlib.util.spec_from_file_location(class_name, local_file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[class_name] = module
    spec.loader.exec_module(module)

    # Return the class
    return getattr(module, class_name)

class CustomUnpickler(pickle.Unpickler):
    def find_class(self, module, name):
        if name == 'MultiTaskCNN':  # Replace with the actual class name
            return globals()[name]
        return super().find_class(module, name)

def load_image_from_s3(bucket_name, folder_name, image_name):
    try:
        # Construct the full key for the image
        key = f"{folder_name}/{image_name}"
        print(f"Constructed S3 Key: {key}")  # Print the constructed key for debugging
        
        # Fetch the image from S3
        response = s3.get_object(Bucket=bucket_name, Key=key)
        image_data = response['Body'].read()
        
        # Convert the image data to a base64 string
        base64_image = base64.b64encode(image_data).decode('utf-8')
        
        return base64_image
    except Exception as e:
        print(f"Error loading image from S3: {e}")
        return None

@app.route('/flask/predict', methods=['POST'])
def predict_bounding_boxes():
    try:
        data = request.get_json()
        model_name = data['modelName']
        folder_name = data['folderName']
        file_name = data['fileName']
        #base64_image = data['base64Image']
        base64_image = load_image_from_s3('dsai-imageuploads', folder_name, file_name)

        # Download and import class definition from Python file in S3
        class_file_name = f"{model_name}-ClassDefinition.py"
        class_name = 'MultiTaskCNN'  # Replace with the actual class name
        ModelClass = download_and_import_class_from_s3(modelBucketName, class_file_name, class_name)

        # Add the imported model class to the global namespace
        globals()[class_name] = ModelClass

        # Check if the class is available in the global namespace
        if class_name in globals():
            # Print the class definition
            print(inspect.getsource(ModelClass))
            print(f"Class {class_name} is now available in the global namespace.")
        else:
            print(f"Class {class_name} is NOT available in the global namespace.")

        # Read the .pkl file from S3 into memory
        model_file_name = f"{model_name}-model.pkl"
        params = {
            'Bucket': modelBucketName,
            'Key': model_file_name
        }
        model_buffer = s3.get_object(**params)['Body'].read()

        # Load the model from the buffer
        #model = joblib.load(io.BytesIO(model_buffer))
        #model = pickle.load(io.BytesIO(model_buffer))
        #model = pickle.loads(model_buffer, fix_imports=True, encoding="bytes")
        model = CustomUnpickler(io.BytesIO(model_buffer)).load()

        # Ensure the model can reference the class
        model.__class__ = ModelClass

        # Ensure proper padding for base64 string
        #base64_image += '=' * (-len(base64_image) % 4)

        # Decode the base64 image
        try:
            image_data = base64.b64decode(base64_image)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')  # Ensure image is in RGB format
        except Exception as e:
            print(str(e))
            return jsonify({'error': f"Failed to decode and open image: {str(e)}"}), 400

        # Preprocess the image as required by your model
        # Preprocess the image (resize, convert to tensor, normalize)
        preprocess = transforms.Compose([
            transforms.Resize((128, 128)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
        image_tensor = preprocess(image).unsqueeze(0)  # Add batch dimension

        # Perform prediction using the model
        model.eval()
        with torch.no_grad():
            coords, class_logits = model(image_tensor)
        
        # Ensure the results are numbers before comparison
        x = max(0, float(coords[0][0]))
        y = max(0, float(coords[0][1]))
        width = max(0, float(coords[0][2]))
        height = max(0, float(coords[0][3]))

        # Convert class logits to a list and find the index of the maximum value
        class_logits_list = class_logits[0].tolist()
        cat_index = class_logits_list.index(max(class_logits_list))

        # Query Neo4j to get the category based on the model name and the index of the maximum value
        with neo4j_driver.session() as session:
            neo4j_result = session.run(
                "MATCH (m:Model {name: $modelName}) RETURN m.classifierCategories AS classes",
                {"modelName": model_name}
            )
            category = neo4j_result.single()["classes"][cat_index]

            # Update Neo4j with the prediction results
            session.run(
                """
                MATCH (m:Model {name: $modelName}),
                      (i:Image {folderName: $folderName, fileName: $fileName})
                MERGE (m)-[r:Labelled {category: $category}]->(i)
                ON CREATE SET r.x = $x, r.y = $y, r.width = $width, r.height = $height, 
                              r.createdOn = datetime(), r.updatedOn = datetime(), 
                              r.isActive = $isActive, r.isShown = $isShown 
                ON MATCH SET r.x = $x, r.y = $y, r.width = $width, r.height = $height,
                             r.updatedOn = datetime(),
                             r.isActive = $isActive, r.isShown = $isShown
                """,
                {
                    "modelName": model_name,
                    "folderName": folder_name,
                    "fileName": file_name,
                    "category": category,
                    "x": x,
                    "y": y,
                    "width": width,
                    "height": height,
                    "isActive": False,
                    "isShown": True,
                }
            )

        return jsonify({
            "x": x,
            "y": y,
            "width": width,
            "height": height,
            "category": category
        })

    except Exception as e:
        print(str(e))
        return jsonify({'error': str(e)}), 500



app.config['UPLOAD_FOLDER'] = os.path.join('static', 'uploads')
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def save_image(username, file, filename):
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], username, filename)
    with open(file_path, 'wb') as f:
        f.write(file.read())

# try visiting http://127.0.0.1:5000/imgserver/test 
# and drop in a jpg file, then look at the static/uploads/test folder
@app.route('/flask/imgserver/<string:username>')
def imgserver(username):
    user_folder = os.path.join(app.config['UPLOAD_FOLDER'], username)
    os.makedirs(user_folder, exist_ok=True)  # Ensure the user folder exists
    file_urls = [url_for('uploaded_file', username=username, filename=f) for f in os.listdir(user_folder)]
    return render_template('imgserver.html', file_urls=file_urls, username=username)

@app.route('/flask/imgserver/upload/<string:username>', methods=['POST'])
def upload_file(username):
    if 'file' not in request.files:
        return redirect(request.url)
    files = request.files.getlist('file')
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            if filename.rsplit('.', 1)[1].lower() == 'zip':
                with zipfile.ZipFile(file, 'r') as zip_ref:
                    for zip_info in zip_ref.infolist():
                        if allowed_file(zip_info.filename):
                            zip_info.filename = os.path.basename(zip_info.filename)
                            with zip_ref.open(zip_info) as extracted_file:
                                save_image(username, extracted_file, zip_info.filename)
            else:
                save_image(username, file, filename)
    return '', 204

@app.route('/flask/imgserver/uploads/<string:username>/<filename>')
def uploaded_file(username, filename):
    return redirect(url_for('static', filename='uploads/'+username+'/'+filename), code=301)

@app.route('/flask/imgserver/uploaded_images/<string:username>')
def uploaded_images(username):
    file_urls = [url_for('uploaded_file', username=username, filename=f) for f in os.listdir(os.path.join(app.config['UPLOAD_FOLDER'], username))]
    return jsonify(file_urls)

if __name__ == '__main__':
    app.run(debug=True)