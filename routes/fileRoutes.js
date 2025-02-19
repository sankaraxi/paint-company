const express = require("express");
const router = express.Router();
const { 
  createProject, 
  getProjects, 
  uploadFile, 
  getSheetsByProject, 
  getSheetById, 
  getSheets,
  getFile,
} = require("../controllers/fileController");

// Create a new project
router.post("/projects", createProject);

// Get all projects
router.get("/projects", getProjects);

// Upload file and associate with `projectId`
router.post("/upload/:projectId", uploadFile);

// Get all sheets by `projectId`
router.get("/sheets/:projectId", getSheetsByProject);

// Get sheet data by `sheetId`
router.get("/sheet/:sheetId", getSheetById);

router.get("/sheets", getSheets);   

router.get("/excel/:fileName", getFile);

module.exports = router;
