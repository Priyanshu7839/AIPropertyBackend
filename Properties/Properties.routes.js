import express from 'express'
import { createProperty } from './Properties.controller.js';

const Router = express.Router()




Router.post("/add", createProperty);



export default Router