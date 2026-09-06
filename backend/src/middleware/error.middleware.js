const { ValidationError, UniqueConstraintError } = require('sequelize');
const multer = require('multer');

const errorHandler = (err, req, res, next) => {
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ message: 'Duplicate value', errors: err.errors?.map((e) => e.message) });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ message: 'Validation error', errors: err.errors?.map((e) => e.message) });
  }
  if (err instanceof multer.MulterError || /รองรับเฉพาะไฟล์รูปภาพ/.test(err.message || '')) {
    return res.status(400).json({ message: err.message });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
};

module.exports = errorHandler;
