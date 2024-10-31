import mongoose from 'mongoose';
import config from '../../loadConfig';

async function connect(){
    const dbUri = config.dbUri;
    const domain = config.domain;
    console.log("dbUri: " + dbUri)
    console.log("domain: " + domain);
    console.log("googleId: " + config.googleClientId);

    try{
        await mongoose.connect(dbUri);
        console.log("DB Connected");
    }catch(error){
        console.log("Connection fail");
        process.exit(1);
    }
}

export default connect; 