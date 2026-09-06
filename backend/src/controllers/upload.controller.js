const create = (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์ที่อัปโหลด' });
  res.status(201).json({ url: `/uploads/${req.file.filename}` });
};

module.exports = { create };
