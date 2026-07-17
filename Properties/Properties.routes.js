import express from 'express'
import { createProperty, getProperty, updateListingTypes } from './Properties.controller.js';

const Router = express.Router()




Router.post("/add/:user_id/:propertyType", createProperty);

Router.get("/fetch/:user_id/:propertyType", getProperty);

Router.post(
    "/update/:propertyType/:property_id/listing-types",
    updateListingTypes
);


export default Router