const express = require("express");
const groupController = require("../controllers/groupController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// All routes are protected
router.use(protect);

router
  .route("/")
  .post(groupController.createGroup)
  .get(groupController.getUserGroups);

router.route("/join").post(groupController.joinGroup);

router
  .route("/:id")
  .get(groupController.getGroupById)
  .put(groupController.updateGroup)
  .delete(groupController.deleteGroup);

router.route("/:id/leave").delete(groupController.leaveGroup);

router.route("/:id/refresh-code").put(groupController.refreshInvitationCode);

router.route("/:id/promote/:memberId").put(groupController.promoteMember);

router.route("/:id/remove/:memberId").delete(groupController.removeMember);

module.exports = router;
