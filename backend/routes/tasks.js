const express = require("express");
const router = express.Router();
const {
  createTask,
  getUserTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getGroupTasks,
  updateTaskStatus,
  getTaskStats,
} = require("../controllers/taskController");
const { protect } = require("../middleware/auth");

// All routes are protected
router.use(protect);

router.route("/").post(createTask).get(getUserTasks);

router.route("/stats").get(getTaskStats);

router.route("/group/:groupId").get(getGroupTasks);

router.route("/:id").get(getTaskById).put(updateTask).delete(deleteTask);

router.route("/:id/status").put(updateTaskStatus);

module.exports = router;
