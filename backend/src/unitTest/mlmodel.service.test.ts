import neo4j from 'neo4j-driver'; // Import the driver
import { serviceActions } from '../service/mlmodel.service';

// Mock the Neo4j driver and session
jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn(),
    close: jest.fn(),
    beginTransaction: jest.fn(() => ({
      run: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
    })),
  };

  const mockDriver = {
    session: jest.fn(() => mockSession),
  };

  return {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn(() => 'mockAuthToken'),
    },
  };
});

// Test suite for serviceActions
describe('serviceActions', () => {
  let session: any;
  let transaction: any;

  beforeAll(() => {
    // Call the driver with mock parameters
    const mockUrl = 'bolt://localhost:7687'; // Use a mock URL
    const mockAuth = neo4j.auth.basic('username', 'password'); // Use mock auth
    const driver = neo4j.driver(mockUrl, mockAuth); // This now uses the mocked driver
    session = driver.session(); // Create a session from the mocked driver
    transaction = session.beginTransaction(); // Start a transaction for testing
  });

  afterAll(async () => {
    await session.close(); // Close the session after tests
  });

  // New test suite for filterModelDefinitionOptions
  describe('filterModelDefinitionOptions', () => {
    it('should return filtered model definition options', async () => {
      // Arrange
      const mockStages = { stage1: 'NeuralNetwork' };
      const mockTypes = { type1: 'Convolution' };
      const mockMethods = { method1: 'Conv2d' };

      // Mock the Neo4j query response
      session.run.mockResolvedValueOnce({
        records: [
          {
            toObject: () => ({
              Stage: 'NeuralNetwork',
              Type: 'Convolution',
              Method: 'Conv2d',
              Name: 'Conv2d',
              Code: 'Convolution 2D',
              InputNames: [
                'in_channels',
                'min_out_channels',
                'max_out_channels',
                'kernel_size',
                'padding',
                'stride',
              ],
              InputTypes: [
                'int',
                'int',
                'int',
                'int',
                'int',
                'int',
              ],
              NextAllowables: ['ReLU', 'ELU', 'LeakyReLU', 'Swish'],
            }),
          },
        ],
      });

      // Act
      const result = await serviceActions.filterModelDefinitionOptions(mockStages, mockTypes, mockMethods);

      // Assert
      expect(result).toEqual([
        {
          Stage: 'NeuralNetwork',
          Type: 'Convolution',
          Method: 'Conv2d',
          Name: 'Conv2d',
          Code: 'Convolution 2D',
          InputNames: [
            'in_channels',
            'min_out_channels',
            'max_out_channels',
            'kernel_size',
            'padding',
            'stride',
          ],
          InputTypes: [
            'int',
            'int',
            'int',
            'int',
            'int',
            'int',
          ],
          NextAllowables: ['ReLU', 'ELU', 'LeakyReLU', 'Swish'],
        },
      ]);

      expect(session.run).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });

    it('should handle empty input and return all options', async () => {
      // Arrange
      const mockStages = {};
      const mockTypes = {};
      const mockMethods = {};

      // Mock the Neo4j query response
      session.run.mockResolvedValueOnce({
        records: [],
      });

      // Act
      const result = await serviceActions.filterModelDefinitionOptions(mockStages, mockTypes, mockMethods);

      // Assert
      expect(result).toEqual([]);
      expect(session.run).toHaveBeenCalled();
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  });

  // New test suite for getModelDefinitionOptions
  describe('getModelDefinitionOptions', () => {
    let session;
    
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });

    beforeAll(() => {
      // Call the driver with mock parameters
      const mockUrl = 'bolt://localhost:7687'; // Use a mock URL
      const mockAuth = neo4j.auth.basic('username', 'password'); // Use mock auth
      const driver = neo4j.driver(mockUrl, mockAuth); // This now uses the mocked driver
      session = driver.session(); // Create a session from the mocked driver
    });
  
    afterAll(async () => {
      await session.close(); // Close the session after tests
    });
  
    it('should return model definition options for a given method', async () => {
      // Arrange
      const method = 'Conv2d';
      const mockResult = {
        records: [
          {
            toObject: () => ({
              Stage: 'NeuralNetwork',
              Type: 'Convolution',
              Method: 'Conv2d',
              Name: 'Convolution Layer',
              Code: 'Conv2d Code',
              InputNames: ['input1', 'input2'],
              InputTypes: ['float', 'float'],
              NextAllowables: ['ReLU', 'LeakyReLU'],
            }),
          },
        ],
      };
  
      // Mock the Neo4j query response
      session.run.mockResolvedValueOnce(mockResult);
  
      // Act
      const result = await serviceActions.getModelDefinitionOptions(method);
  
      // Assert
      expect(result).toEqual([
        {
          Stage: 'NeuralNetwork',
          Type: 'Convolution',
          Method: 'Conv2d',
          Name: 'Convolution Layer',
          Code: 'Conv2d Code',
          InputNames: ['input1', 'input2'],
          InputTypes: ['float', 'float'],
          NextAllowables: ['ReLU', 'LeakyReLU'],
        },
      ]);
  
      expect(session.run).toHaveBeenCalledTimes(1); // Ensure run was called once
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { Method: method }); // Check if called with correct parameters
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  
    it('should handle an empty result', async () => {
      // Arrange
      const method = 'NonExistentMethod';
      const mockResult = {
        records: [],
      };
  
      // Mock the Neo4j query response
      session.run.mockResolvedValueOnce(mockResult);
  
      // Act
      const result = await serviceActions.getModelDefinitionOptions(method);
  
      // Assert
      expect(result).toEqual([]); // Expect an empty array for no records
  
      expect(session.run).toHaveBeenCalledTimes(1); // Ensure run was called once
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { Method: method }); // Check if called with correct parameters
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  });

  // New test suite for getModelNextAllowableOptions
  describe('getModelNextAllowableOptions', () => {
    it('should return the next allowable options based on the method', async () => {
      const method = 'Conv2d';

      // Mocking the result of the session.run
      const mockRecords = [
        {
          toObject: jest.fn(() => ({
            Stage: 'NeuralNetwork',
            Type: 'Convolution',
            Method: 'Conv2d',
            Name: 'Conv2d',
            Code: 'Convolution 2D',
            InputNames: [
              'in_channels',
              'min_out_channels',
              'max_out_channels',
              'kernel_size',
              'padding',
              'stride',
            ],
            InputTypes: [
              'int',
              'int',
              'int',
              'int',
              'int',
              'int',
            ],
            NextAllowables: ['ReLU', 'ELU', 'LeakyReLU', 'Swish'],
          })),
        },
        {
          toObject: jest.fn(() => ({
            Stage: 'Stage2',
            Type: 'Type2',
            Method: 'Method2',
            Name: 'Name2',
            Code: 'Code2',
            InputNames: ['input2'],
            InputTypes: ['type2'],
            NextAllowables: ['NextMethod3'],
          })),
        },
      ];

      session.run.mockResolvedValueOnce({ records: mockRecords });

      const result = await serviceActions.getModelNextAllowableOptions(method);

      expect(session.run).toHaveBeenCalledWith(expect.any(String), { Method: method });
      expect(result).toEqual(mockRecords.map(record => record.toObject()));
      expect(session.close).toHaveBeenCalled();
    });

    it('should handle no records found', async () => {
      const method = 'TestMethod';

      // Mocking the result of the session.run for no records
      session.run.mockResolvedValueOnce({ records: [] });

      const result = await serviceActions.getModelNextAllowableOptions(method);

      expect(result).toEqual([]);
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { Method: method });
      expect(session.close).toHaveBeenCalled();
    });
  });

  // New test suite for getJobs
  describe('getJobs', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });

    it('should return jobs and total job count for valid inputs', async () => {
      // Arrange
      const itemsPerPage = 2;
      const pageNumber = 1;

      // Mock return values for session.run
      session.run
        .mockResolvedValueOnce({
          records: [
            {
              get: jest.fn((key) => {
                const data = {
                  name: 'Job1',
                  createdOn: new Date('2023-01-01'),
                  updatedOn: new Date('2023-01-02'),
                };
                return data[key];
              }),
            },
            {
              get: jest.fn((key) => {
                const data = {
                  name: 'Job2',
                  createdOn: new Date('2023-01-03'),
                  updatedOn: new Date('2023-01-04'),
                };
                return data[key];
              }),
            },
          ],
        });

      session.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn(() => 5), // Mock total jobs
          },
        ],
      });

      // Act
      const result = await serviceActions.getJobs(itemsPerPage, pageNumber);

      // Assert
      expect(result).toEqual({
        jobs: [
          { name: 'Job1', createdOn: expect.any(Date), updatedOn: expect.any(Date) },
          { name: 'Job2', createdOn: expect.any(Date), updatedOn: expect.any(Date) },
        ],
        totalJobs: 5,
      });
      expect(session.run).toHaveBeenCalledTimes(2); // Ensure run was called twice
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { offset: 0, itemsPerPage: 2 });
    });

    it('should throw an error for invalid inputs', async () => {
      // Arrange
      const invalidInputs = [
        { itemsPerPage: -1, pageNumber: 1 },
        { itemsPerPage: 2, pageNumber: 0 },
        { itemsPerPage: 2.5, pageNumber: 1 },
        { itemsPerPage: 2, pageNumber: -1 },
      ];

      // Act & Assert
      for (const { itemsPerPage, pageNumber } of invalidInputs) {
        await expect(serviceActions.getJobs(itemsPerPage, pageNumber)).rejects.toThrow(
          'itemsPerPage and pageNumber must be positive integers'
        );
      }
    });

    it('should handle errors during Neo4j query execution', async () => {
      // Arrange
      const itemsPerPage = 2;
      const pageNumber = 1;
      session.run.mockRejectedValueOnce(new Error('Neo4j query error'));

      // Act & Assert
      await expect(serviceActions.getJobs(itemsPerPage, pageNumber)).rejects.toThrow('Neo4j query error');
      expect(session.run).toHaveBeenCalledTimes(1); // Ensure it called only once before the error
    });
  });

  describe('getModelsInJob', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should return models and total model count for valid inputs', async () => {
      const jobName = 'TestJob';
      const itemsPerPage = 2;
      const pageNumber = 1;
  
      // Mock return values for the first query (fetching models)
      session.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                name: 'Model1',
                createdOn: new Date('2023-01-01'),
                updatedOn: new Date('2023-01-02'),
                accuracy: 0.9,
                precision: 0.8,
                recall: 0.7,
                f1Score: 0.75,
                rmse: 0.1,
                classifierKeys: ['key1'],
                classifierCategories: ['category1'],
                status: 'completed',
              };
              return data[key];
            }),
          },
          {
            get: jest.fn((key) => {
              const data = {
                name: 'Model2',
                createdOn: new Date('2023-01-03'),
                updatedOn: new Date('2023-01-04'),
                accuracy: 0.85,
                precision: 0.75,
                recall: 0.65,
                f1Score: 0.7,
                rmse: 0.15,
                classifierKeys: ['key2'],
                classifierCategories: ['category2'],
                status: 'in-progress',
              };
              return data[key];
            }),
          },
        ],
      });
  
      // Mock return value for the second query (counting models)
      session.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn(() => 5), // Mock total models
          },
        ],
      });
  
      // Act
      const result = await serviceActions.getModelsInJob(jobName, itemsPerPage, pageNumber);
  
      // Assert
      expect(result).toEqual({
        models: [
          {
            name: 'Model1',
            createdOn: expect.any(Date),
            updatedOn: expect.any(Date),
            accuracy: 0.9,
            precision: 0.8,
            recall: 0.7,
            f1Score: 0.75,
            rmse: 0.1,
            classifierKeys: ['key1'],
            classifierCategories: ['category1'],
            status: 'completed',
          },
          {
            name: 'Model2',
            createdOn: expect.any(Date),
            updatedOn: expect.any(Date),
            accuracy: 0.85,
            precision: 0.75,
            recall: 0.65,
            f1Score: 0.7,
            rmse: 0.15,
            classifierKeys: ['key2'],
            classifierCategories: ['category2'],
            status: 'in-progress',
          },
        ],
        totalModels: 5,
      });
      expect(session.run).toHaveBeenCalledTimes(2); // Ensure run was called twice
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { jobName, offset: 0, itemsPerPage });
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  
    it('should throw an error for invalid inputs', async () => {
      await expect(serviceActions.getModelsInJob('', 2, 1)).rejects.toThrow('jobName must be provided');
      await expect(serviceActions.getModelsInJob('TestJob', -1, 1)).rejects.toThrow('itemsPerPage and pageNumber must be positive integers');
      await expect(serviceActions.getModelsInJob('TestJob', 2, 0)).rejects.toThrow('itemsPerPage and pageNumber must be positive integers');
    });
  });

  describe('deleteJobByName', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should delete a job and its models successfully', async () => {
      const jobName = 'TestJob';
  
      // Mock return value for the deletion query
      session.run.mockResolvedValueOnce({
        summary: {
          counters: {
            updates: () => ({
              nodesDeleted: 2, // Simulating deletion of the job and its associated models
            }),
          },
        },
      });
  
      // Act
      await serviceActions.deleteJobByName(jobName);
  
      // Assert
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { jobName });
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  
    it('should throw an error if job name is not provided', async () => {
      await expect(serviceActions.deleteJobByName('')).rejects.toThrow('Job name is required');
    });
  
    it('should throw an error if job could not be deleted', async () => {
      const jobName = 'TestJob';
  
      // Mock return value to simulate no nodes deleted
      session.run.mockResolvedValueOnce({
        summary: {
          counters: {
            updates: () => ({
              nodesDeleted: 0, // Simulating failure to delete
            }),
          },
        },
      });
  
      // Act and Assert
      await expect(serviceActions.deleteJobByName(jobName)).rejects.toThrow(`Job ${jobName} could not be deleted`);
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { jobName });
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  
    it('should handle errors from the session run method', async () => {
      const jobName = 'TestJob';
  
      // Mock the session.run to throw an error
      session.run.mockRejectedValueOnce(new Error('Query failed'));
  
      // Act and Assert
      await expect(serviceActions.deleteJobByName(jobName)).rejects.toThrow('Query failed');
      expect(session.run).toHaveBeenCalledWith(expect.any(String), { jobName });
      expect(session.close).toHaveBeenCalled(); // Ensure the session is closed
    });
  });

  describe('updateModelStatusByName', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should update the model status successfully', async () => {
      const modelName = 'TestModel';
      const newStatus = 'Active';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [{ get: jest.fn(() => ({ name: modelName, status: newStatus })) }],
      });
  
      // Act
      const result = await serviceActions.updateModelStatusByName(modelName, newStatus);
  
      // Assert
      expect(result).toBe(`Model status updated to ${newStatus}`);
      expect(session.run).toHaveBeenCalledWith(
        "MATCH (m:Model {name: $modelName}) SET m.status = $newStatus RETURN m",
        { modelName, newStatus }
      );
    });
  
    it('should throw an error if the model is not found', async () => {
      const modelName = 'NonExistentModel';
      const newStatus = 'Inactive';
  
      // Mock the Neo4j response for a non-existent model
      session.run.mockResolvedValueOnce({ records: [] });
  
      // Act and Assert
      await expect(serviceActions.updateModelStatusByName(modelName, newStatus)).rejects.toThrow(`Could not update model status`);
    });
  
    it('should throw an error if there is an issue with the database operation', async () => {
      const modelName = 'TestModel';
      const newStatus = 'Active';
  
      // Mock the Neo4j response to throw an error
      session.run.mockRejectedValueOnce(new Error('Database error'));
  
      // Act and Assert
      await expect(serviceActions.updateModelStatusByName(modelName, newStatus)).rejects.toThrow('Could not update model status');
    });
  
    it('should ensure session is closed after operation', async () => {
      const modelName = 'TestModel';
      const newStatus = 'Active';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [{ get: jest.fn(() => ({ name: modelName, status: newStatus })) }],
      });
  
      await serviceActions.updateModelStatusByName(modelName, newStatus);
      expect(session.close).toHaveBeenCalled(); // Ensure session is closed
    });
  });

  describe('findModelsByStatus', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should return an array of model names with the given status', async () => {
      const status = 'Active';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [
          { get: jest.fn(() => 'Model1') },
          { get: jest.fn(() => 'Model2') },
        ],
      });
  
      // Act
      const result = await serviceActions.findModelsByStatus(status);
  
      // Assert
      expect(result).toEqual(['Model1', 'Model2']);
      expect(session.run).toHaveBeenCalledWith(
        "MATCH (m:Model {status: $status}) RETURN m.name AS name",
        { status }
      );
    });
  
    it('should throw an error if there is an issue with the database operation', async () => {
      const status = 'Active';
  
      // Mock the Neo4j response to throw an error
      session.run.mockRejectedValueOnce(new Error('Database error'));
  
      // Act and Assert
      await expect(serviceActions.findModelsByStatus(status)).rejects.toThrow(`Error finding models with status ${status}.`);
    });
  
    it('should ensure session is closed after operation', async () => {
      const status = 'Active';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [{ get: jest.fn(() => 'Model1') }],
      });
  
      await serviceActions.findModelsByStatus(status);
      expect(session.close).toHaveBeenCalled(); // Ensure session is closed
    });
  });

  describe('getExistingCompletedModel', () => {

    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should return existing completed models with valid parameters', async () => {
      const classifierCategories = '[]';
      const classifierTrainFolder = 'train-folder';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                name: 'Model1',
                evalAccuracy: 0.95,
                evalAvgLoss: 0.1,
                evalF1Score: 0.9,
                evalFalsePositiveRate: 0.05,
                evalPrecision: 0.92,
                evalRecall: 0.93,
                evalRmse: 0.2,
              };
              return data[key];
            }),
          },
        ],
      });
  
      // Act
      const result = await serviceActions.getExistingCompletedModel(classifierCategories, classifierTrainFolder);
  
      // Assert
      expect(result).toEqual([{
        name: 'Model1',
        evalAccuracy: 0.95,
        evalAvgLoss: 0.1,
        evalF1Score: 0.9,
        evalFalsePositiveRate: 0.05,
        evalPrecision: 0.92,
        evalRecall: 0.93,
        evalRmse: 0.2,
      }]);
  
      expect(session.run).toHaveBeenCalledWith(expect.stringContaining('MATCH (p:Model)'), {
        status: "C",
        classifierTrainFolder: classifierTrainFolder,
        classifierCategories: classifierCategories,
      });
    });
  
    it('should return an empty array if no models found', async () => {
      const classifierCategories = '[]';
      const classifierTrainFolder = 'train-folder';
  
      // Mock the Neo4j response to return no records
      session.run.mockResolvedValueOnce({ records: [] });
  
      // Act
      const result = await serviceActions.getExistingCompletedModel(classifierCategories, classifierTrainFolder);
  
      // Assert
      expect(result).toEqual([]);
      expect(session.run).toHaveBeenCalled();
    });
  
    it('should throw an error if there is an issue with the database operation', async () => {
      const classifierCategories = '[]';
      const classifierTrainFolder = 'train-folder';
  
      // Mock the Neo4j response to throw an error
      session.run.mockRejectedValueOnce(new Error('Database error'));
  
      // Act and Assert
      await expect(serviceActions.getExistingCompletedModel(classifierCategories, classifierTrainFolder)).rejects.toThrow('Database error');
    });
  
    it('should ensure session is closed after operation', async () => {
      const classifierCategories = '[]';
      const classifierTrainFolder = 'train-folder';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [{ get: jest.fn(() => 'Model1') }],
      });
  
      await serviceActions.getExistingCompletedModel(classifierCategories, classifierTrainFolder);
      expect(session.close).toHaveBeenCalled(); // Ensure session is closed
    });
  });

  describe('getSelectedExistingModel', () => {
    beforeEach(() => {
      jest.clearAllMocks(); // Clear mocks before each test
    });
  
    it('should return the selected existing model with valid parameters', async () => {
      const existingModelName = 'TestModel';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [
          {
            get: jest.fn((key) => {
              const data = {
                name: 'TestModel',
                script: 'print("Hello, World!")',
              };
              return data[key];
            }),
          },
        ],
      });
  
      // Act
      const result = await serviceActions.getSelectedExistingModel(existingModelName);
  
      // Assert
      expect(result).toEqual([{
        name: 'TestModel',
        script: 'print("Hello, World!")',
      }]);
  
      expect(session.run).toHaveBeenCalledWith(expect.stringContaining('MATCH (p:Model {name: $existingModelName})'), { existingModelName });
    });
  
    it('should return an empty array if no model found', async () => {
      const existingModelName = 'NonExistentModel';
  
      // Mock the Neo4j response to return no records
      session.run.mockResolvedValueOnce({ records: [] });
  
      // Act
      const result = await serviceActions.getSelectedExistingModel(existingModelName);
  
      // Assert
      expect(result).toEqual([]);
      expect(session.run).toHaveBeenCalled();
    });
  
    it('should throw an error if there is an issue with the database operation', async () => {
      const existingModelName = 'TestModel';
  
      // Mock the Neo4j response to throw an error
      session.run.mockRejectedValueOnce(new Error('Database error'));
  
      // Act and Assert
      await expect(serviceActions.getSelectedExistingModel(existingModelName)).rejects.toThrow('Database error');
    });
  
    it('should ensure session is closed after operation', async () => {
      const existingModelName = 'TestModel';
  
      // Mock the Neo4j response
      session.run.mockResolvedValueOnce({
        records: [{ get: jest.fn((key) => key === 'name' ? 'TestModel' : 'print("Hello, World!")') }],
      });
  
      await serviceActions.getSelectedExistingModel(existingModelName);
      expect(session.close).toHaveBeenCalled(); // Ensure session is closed
    });
  });

});