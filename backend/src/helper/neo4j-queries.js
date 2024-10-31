// Import Neo4j driver
const neo4j = require('neo4j-driver');

// Initialize Neo4j connection
const driver = neo4j.driver(
    'neo4j://ec2-3-0-220-120.ap-southeast-1.compute.amazonaws.com:7687', 
    neo4j.auth.basic('neo4j', 'password'));
const session = driver.session();

const neo4jQueries = {

  // 101 Node Create
  async createNode(
    label1, id1, attributes) {

    const query = `
      MERGE (a:${label1} {id: ${id1},
      ${Object.keys(attributes).map(
        key => `a.${key} = ${attributes[key]}`).join(',\n')}
      })
      ON CREATE SET a.CreatedOn = datetime(), a.UpdatedOn = datetime()
      RETURN a;
    `;
    return await session.run(
        query, 
        { label1, id1, attributes }
    );
  },

  // 102 Node Read
  async readNode(
    label1, id1) {

    const query = `
      MATCH (a:${label1} {id: ${id1}})
      RETURN a;
    `;
    return await session.run(
        query, 
        { label1, id1 });
  },

  // 103 Node Update
  async updateNode(
    label1, id1, attributes) {

    const query = `
      MATCH (a:${label1} {id: ${id1}})
      SET a.UpdatedOn = datetime(),
      ${Object.keys(attributes).map(
        key => `a.${key} = ${attributes[key]}`).join(',\n')}
      RETURN a;  
    `;
    return await session.run(
        query, 
        { label1, id1, attributes }
    );
  },

  // 104 Node Delete
  async deleteNode(
    label1, id1) {

    const query = `
      MATCH (a:${label1} {id: ${id1}})
      DETACH DELETE a;
    `;
    return await session.run(
        query, 
        { label1, id1 });
  },
  
  // 105 Relationship Create
  async createRelationship(
    label1, id1, 
    label2, id2, 
    relationshipType, id3, attributes) {

    const query = `
      MATCH 
      (a:${label1} {id: ${id1}}), (b:${label2} {id: ${id2}})
      MERGE (a)-[r:${relationshipType}]->(b)
      ON CREATE SET r.id = ${id3},
      r.CreatedOn = datetime(), r.UpdatedOn = datetime(), 
      ${Object.keys(attributes).map(
        key => `r.${key} = ${attributes[key]}`).join(',\n')}
      RETURN r;
    `;
    return await session.run(
        query, 
        { label1, id1, label2, id2, 
            relationshipType, id3, attributes }
    );
  },

  // 106 Relationship Read
  async readRelationships(
    label1, id1, 
    relationshipType) {

    const query = `
      MATCH 
      (a:${label1} {id: ${id1}})
      -[r:${relationshipType}]->
      (b)
      RETURN r, b;
    `;
    return await session.run(
        query, 
        { label1, id1, 
            relationshipType }
    );
  },

  // 107 Relationship Update
  async updateRelationship(
    label1, id1, 
    label2, id2, 
    relationshipType, attributes) {

    const query = `
      MATCH (a:${label1} {id: ${id1}})
      -[r:${relationshipType}]->
      (b:${label2} {id: ${id2}})
      SET r.UpdatedOn = datetime(),
      ${Object.keys(attributes).map(
        key => `r.${key} = ${attributes[key]}`).join(',\n')}
      RETURN a, r, b;
    `;
    return await session.run(
        query, 
        { label1, id1, 
          label2, id2, 
          relationshipType, attributes });
  },

  // 108 Relationship Delete
  async deleteRelationship(
    label1, id1, 
    label2, id2, 
    relationshipType, id3) {

    const query = `
      MATCH (a:${label1} {id: ${id1}})
      -[r:${relationshipType} {id: ${id3}}]->
      (b:${label2} {id: ${id2}})
      DELETE r;
    `;
    return await session.run(
        query, 
        { label1, id1, 
          label2, id2, 
          relationshipType, id3 });
  },

  //Create or update node
  async updateOrCreateNode(label, identifier, properties) {
  const query = `
    MERGE (n:${label} { identifier: $identifier })
    ON CREATE SET n += $properties
    ON MATCH SET n += $properties
    RETURN n
  `;

  try {
    const result = await session.run(query, {
      identifier,
      properties: properties,
    });

    const record = result.records[0]?.get('n');
    return record ? record.properties : null;
  } catch (error) {
    console.error('Error updating or creating node:', error);
  } finally {
    await session.close(); // Close the session after operations
    await driver.close();  // Close the driver when done
  }
}

};

// Close Neo4j session and driver connection
async function closeConnection() {
  await session.close();
  await driver.close();
}

// Export the queries and closeConnection function
module.exports = { neo4jQueries, closeConnection };