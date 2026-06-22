const router = require("express").Router();
const { authenticate, requireRole } = require("../middleware/authmiddleware");
const {
  listGroups, createGroup, updateGroup, deleteGroup, getGroup, addMember,
  removeMember, createBill,
  uploadGroupPicture, deleteGroupPicture, setCashSettlement,
  getSplitPaymentContext, settleSplit,
} = require("../controllers/groupController");

router.use(authenticate, requireRole("user"));
router.get("/", listGroups);
router.post("/", createGroup);
router.get("/:groupId", getGroup);
router.patch("/:groupId", updateGroup);
router.delete("/:groupId", deleteGroup);
router.post("/:groupId/members", addMember);
router.delete("/:groupId/members/:accountId", removeMember);
router.post("/:groupId/picture", uploadGroupPicture);
router.delete("/:groupId/picture", deleteGroupPicture);
router.post("/:groupId/bills", createBill);
router.patch("/splits/:splitId/cash", setCashSettlement);
router.get("/splits/:splitId/payment-context", getSplitPaymentContext);
router.post("/splits/:splitId/settle", settleSplit);

module.exports = router;
