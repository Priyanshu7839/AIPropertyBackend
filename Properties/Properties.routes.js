import express from 'express'
import { createProperty, getProperty } from './Properties.controller.js';

const Router = express.Router()




Router.post("/add/:user_id/:propertyType", createProperty);

Router.get("/fetch/:user_id/:propertyType", getProperty);


export default Router