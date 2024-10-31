import express from "express";
import config from "./loadConfig";
import connect from "./src/utils/connect";
import routes from "./src/routes";
import deserializeUser from "./src/middleware/deserializeUser";
import cookieParser from 'cookie-parser';


// TO START BACKEND IN DEV ENVIRONMENT
// npm run start:dev

const app = express();
const port = config.port;

app.get('/', (req, res) => {
  // res.send('Welcome to the NUS ISS DSAI project backend server!');
  // res.send('The port is: ' + config.port);
  res.send('The domain is: ' + config.domain);
});

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(deserializeUser);

routes(app);

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);

  await connect();

});


