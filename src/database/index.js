import Squelize from 'sequelize';
import Mongoose from 'mongoose';

import databaseConfig from '../config/database';

import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';

const models = [User, File, Appointment];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Squelize(databaseConfig);

    models
      .map(model =>model.init(this.connection))
      .map(model =>model.associate && model.associate(this.connection.models));
  }

  mongo(){
    this.mongoConnection = Mongoose.connect(
        process.env.MONGO_URL,
        {useNewUrlParser:true, useFindAndModify:true, useUnifiedTopology:true}
    );
  }
}
export default new Database();