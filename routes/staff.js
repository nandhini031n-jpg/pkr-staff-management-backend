const express = require("express");
const mongoose = require("mongoose");

const Staff = require("../models/Staff");

const router = express.Router();

// =====================================================
// GET ALL STAFF
// GET /api/staff
// =====================================================

router.get("/", async (req, res) => {
  try {
    const staff = await Staff.find()
      .sort({ name: 1 });

    res.status(200).json(staff);
  } catch (error) {
    console.error("GET ALL STAFF ERROR:");
    console.error(error);

    res.status(500).json({
      message: "Failed to load staff",
      error: error.message,
    });
  }
});

// =====================================================
// GET ONE STAFF
// GET /api/staff/:id
// =====================================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error("GET STAFF ERROR:");
    console.error(error);

    res.status(500).json({
      message: "Failed to load staff",
      error: error.message,
    });
  }
});

// =====================================================
// ADD STAFF
// POST /api/staff
// =====================================================

router.post("/", async (req, res) => {
  try {
    const {
      staffId,
      name,
      designation,
      department,
      email,
      phone,
      gender,
      dateOfBirth,
      dateOfJoining,
      qualification,
      specialization,
      profileImage,
      address,
      profile,
    } = req.body;

    // Required fields
    if (!staffId || String(staffId).trim() === "") {
      return res.status(400).json({
        message: "Staff ID is required",
      });
    }

    if (!name || String(name).trim() === "") {
      return res.status(400).json({
        message: "Name is required",
      });
    }

    // Check duplicate Staff ID
    const existingStaff = await Staff.findOne({
      staffId: String(staffId).trim(),
    });

    if (existingStaff) {
      return res.status(409).json({
        message: "Staff ID already exists",
      });
    }

    const newStaff = await Staff.create({
      staffId: String(staffId).trim(),
      name: String(name).trim(),
      designation: designation || "",
      department: department || "",
      email: email || "",
      phone: phone || "",
      gender: gender || "",
      dateOfBirth: dateOfBirth || "",
      dateOfJoining: dateOfJoining || "",
      qualification: qualification || "",
      specialization: specialization || "",
      profileImage:
        profileImage !== undefined
          ? profileImage
          : null,
      address: address || "",
      profile:
        profile !== undefined
          ? profile
          : {},
    });

    res.status(201).json(newStaff);
  } catch (error) {
    console.error("ADD STAFF ERROR:");
    console.error(error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Staff ID already exists",
      });
    }

    res.status(500).json({
      message: "Failed to add staff",
      error: error.message,
    });
  }
});

// =====================================================
// UPDATE STAFF
// PUT /api/staff/:id
// =====================================================

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const existingStaff = await Staff.findById(id);

    if (!existingStaff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    const allowedFields = [
      "staffId",
      "name",
      "designation",
      "department",
      "email",
      "phone",
      "gender",
      "dateOfBirth",
      "dateOfJoining",
      "qualification",
      "specialization",
      "profileImage",
      "address",
      "profile",
    ];

    const updateData = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    }

    // Required field validation
    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "staffId"
      )
    ) {
      updateData.staffId =
        String(updateData.staffId).trim();

      if (updateData.staffId === "") {
        return res.status(400).json({
          message: "Staff ID is required",
        });
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        updateData,
        "name"
      )
    ) {
      updateData.name =
        String(updateData.name).trim();

      if (updateData.name === "") {
        return res.status(400).json({
          message: "Name is required",
        });
      }
    }

    // Check duplicate Staff ID when changing it
    if (
      updateData.staffId &&
      updateData.staffId !== existingStaff.staffId
    ) {
      const duplicateStaff = await Staff.findOne({
        staffId: updateData.staffId,
        _id: { $ne: id },
      });

      if (duplicateStaff) {
        return res.status(409).json({
          message: "Staff ID already exists",
        });
      }
    }

    const updatedStaff =
      await Staff.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    res.status(200).json(updatedStaff);
  } catch (error) {
    console.error("UPDATE STAFF ERROR:");
    console.error(error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Staff ID already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update staff",
      error: error.message,
    });
  }
});

// =====================================================
// DELETE STAFF
// DELETE /api/staff/:id
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await Staff.findById(id);

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found",
      });
    }

    await Staff.findByIdAndDelete(id);

    res.status(200).json({
      message: "Staff deleted successfully",
      id: id,
    });
  } catch (error) {
    console.error("DELETE STAFF ERROR:");
    console.error(error);

    res.status(500).json({
      message: "Failed to delete staff",
      error: error.message,
    });
  }
});

module.exports = router;