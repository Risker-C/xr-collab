const { z } = require('zod');

const roomCreateSchema = z.object({
  name: z.string().min(1).max(100),
  password: z.string().min(4).max(50).optional(),
  isPublic: z.boolean().optional(),
  maxUsers: z.number().int().min(1).max(100).optional()
});

const fileUploadSchema = z.object({
  roomId: z.string().regex(/^[A-Z0-9]{6}$/),
  uploaderId: z.string().uuid(),
  uploaderName: z.string().min(1).max(50)
});

module.exports = { roomCreateSchema, fileUploadSchema };
