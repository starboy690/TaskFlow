const Group = require("./models/Group");
const User = require("../models/User");

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Group name is required",
      });
    }

    // Check if group name already exists for this user
    const existingGroup = await Group.findOne({
      name: name.trim(),
      "members.user": userId,
    });

    if (existingGroup) {
      return res.status(400).json({
        success: false,
        message: "You already have a group with this name",
      });
    }

    // Generate invitation code
    const invitationCode = Math.random()
      .toString(36)
      .substr(2, 8)
      .toUpperCase();

    // Create new group
    const newGroup = new Group({
      name: name.trim(),
      description: description?.trim() || "",
      invitationCode,
      createdBy: userId,
      members: [
        {
          user: userId,
          role: "admin",
          joinedAt: new Date(),
        },
      ],
    });

    await newGroup.save();

    // Populate the group with member details
    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Group created successfully",
      group: populatedGroup,
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating group",
    });
  }
};

// @desc    Get all groups for a user
// @route   GET /api/groups
// @access  Private
const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    const groups = await Group.find({ "members.user": userId })
      .populate("members.user", "name email")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      groups,
      count: groups.length,
    });
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching groups",
    });
  }
};

// @desc    Get single group by ID
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
    })
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or access denied",
      });
    }

    res.json({
      success: true,
      group,
    });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching group",
    });
  }
};

// @desc    Join group with invitation code
// @route   POST /api/groups/join
// @access  Private
const joinGroup = async (req, res) => {
  try {
    const { invitationCode } = req.body;
    const userId = req.user.id;

    if (!invitationCode) {
      return res.status(400).json({
        success: false,
        message: "Invitation code is required",
      });
    }

    const group = await Group.findOne({
      invitationCode: invitationCode.toUpperCase(),
    }).populate("members.user", "name email");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation code",
      });
    }

    // Check if user is already a member
    const isAlreadyMember = group.members.some(
      (member) => member.user._id.toString() === userId
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this group",
      });
    }

    // Add user to group
    group.members.push({
      user: userId,
      role: "member",
      joinedAt: new Date(),
    });

    await group.save();

    // Populate the updated group
    const updatedGroup = await Group.findById(group._id)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: `Successfully joined ${group.name}`,
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error joining group",
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private (Admin only)
const updateGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;
    const { name, description } = req.body;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      "members.role": "admin",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or insufficient permissions",
      });
    }

    if (name && name.trim()) {
      // Check for duplicate name (excluding current group)
      const existingGroup = await Group.findOne({
        name: name.trim(),
        _id: { $ne: groupId },
        "members.user": userId,
      });

      if (existingGroup) {
        return res.status(400).json({
          success: false,
          message: "You already have another group with this name",
        });
      }

      group.name = name.trim();
    }

    if (description !== undefined) {
      group.description = description.trim();
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Group updated successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Update group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating group",
    });
  }
};

// @desc    Leave group
// @route   DELETE /api/groups/:id/leave
// @access  Private
const leaveGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // Check if user is the only admin
    const adminMembers = group.members.filter(
      (member) => member.role === "admin"
    );
    const userMember = group.members.find(
      (member) => member.user.toString() === userId
    );

    if (userMember.role === "admin" && adminMembers.length === 1) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot leave group as the only admin. Transfer ownership or delete group.",
      });
    }

    // Remove user from group
    group.members = group.members.filter(
      (member) => member.user.toString() !== userId
    );

    await group.save();

    res.json({
      success: true,
      message: `You have left ${group.name}`,
    });
  } catch (error) {
    console.error("Leave group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error leaving group",
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (Admin only)
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      "members.role": "admin",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or insufficient permissions",
      });
    }

    await Group.findByIdAndDelete(groupId);

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting group",
    });
  }
};

// @desc    Promote member to admin
// @route   PUT /api/groups/:id/promote/:memberId
// @access  Private (Admin only)
const promoteMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      "members.role": "admin",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or insufficient permissions",
      });
    }

    const memberToPromote = group.members.find(
      (member) => member.user.toString() === memberId
    );

    if (!memberToPromote) {
      return res.status(404).json({
        success: false,
        message: "Member not found in group",
      });
    }

    if (memberToPromote.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Member is already an admin",
      });
    }

    memberToPromote.role = "admin";
    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Member promoted to admin successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Promote member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error promoting member",
    });
  }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/remove/:memberId
// @access  Private (Admin only)
const removeMember = async (req, res) => {
  try {
    const { id: groupId, memberId } = req.params;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      "members.role": "admin",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or insufficient permissions",
      });
    }

    // Cannot remove yourself
    if (memberId === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove yourself. Use leave group instead.",
      });
    }

    const initialMemberCount = group.members.length;
    group.members = group.members.filter(
      (member) => member.user.toString() !== memberId
    );

    if (group.members.length === initialMemberCount) {
      return res.status(404).json({
        success: false,
        message: "Member not found in group",
      });
    }

    await group.save();

    const updatedGroup = await Group.findById(groupId)
      .populate("members.user", "name email")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Member removed from group successfully",
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Remove member error:", error);
    res.status(500).json({
      success: false,
      message: "Server error removing member",
    });
  }
};

// @desc    Refresh invitation code
// @route   PUT /api/groups/:id/refresh-code
// @access  Private (Admin only)
const refreshInvitationCode = async (req, res) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    const group = await Group.findOne({
      _id: groupId,
      "members.user": userId,
      "members.role": "admin",
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found or insufficient permissions",
      });
    }

    group.invitationCode = Math.random()
      .toString(36)
      .substr(2, 8)
      .toUpperCase();
    await group.save();

    res.json({
      success: true,
      message: "Invitation code refreshed successfully",
      invitationCode: group.invitationCode,
    });
  } catch (error) {
    console.error("Refresh code error:", error);
    res.status(500).json({
      success: false,
      message: "Server error refreshing invitation code",
    });
  }
};

module.exports = {
  createGroup,
  getUserGroups,
  getGroupById,
  joinGroup,
  updateGroup,
  leaveGroup,
  deleteGroup,
  promoteMember,
  removeMember,
  refreshInvitationCode,
};
