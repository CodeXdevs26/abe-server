import { Router } from "express";
import { storeControllers } from "./store.controller";

const storeRouters = Router();

storeRouters.get("/", storeControllers.getAllStores)
storeRouters.get("/:id", storeControllers.getSingleStore)

export default storeRouters;
