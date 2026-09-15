const mongoose = require('mongoose');
const educationDocumentSchema =
new mongoose.Schema(
{
name: {
type: String,
default: '',
},
fileName: {
type: String,
required: true,
},
fileType: {
type: String,
default:
'application/octet-stream',
},
fileUrl: {
type: String,
required: true,
},
},
{
_id: true,
},
);
const educationSchema =
new mongoose.Schema(
{
staffId: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Staff',
required: true,
},
qualification: {
type: String,
default: '',
},
degree: {
type: String,
required: true,
trim: true,
},
university: {
type: String,
default: '',
},
yearOfPassing: {
type: String,
default: '',
},
percentage: {
type: String,
default: '',
},
specialization: {
type: String,
default: '',
},
documents: {
type: [educationDocumentSchema],
default: [],
},
},
{
timestamps: true,
},
);
module.exports =
mongoose.model(
'Education',
educationSchema,
);