import express from 'express'
import { createProperty, getDailyBriefing, getProperty, updateListingTypes } from './Properties.controller.js';

const Router = express.Router()




Router.post("/add/:user_id/:propertyType", createProperty);

Router.get("/fetch/:user_id/:propertyType", getProperty);

Router.post(
    "/update/:propertyType/:property_id/listing-types",
    updateListingTypes
);


Router.get('/getBriefing',getDailyBriefing)

export default Router