import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Select,
  MenuItem,
} from 'injast-core/components';
import { Chip } from '@mui/material';
import { defaultColors } from 'injast-core/constants';
import { Trash2, Upload, FileText, Download, AlertCircle } from 'lucide-react';
import { Attachment, AttachmentCategory } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';

export interface PrsAttachmentsPanelProps {
  requestId: string;
  canEdit: boolean;
  teamId?: string;
  onError?: (error: string) => void;
  highlightRequired?: boolean;
  requiredCategories?: string[];
}

export default function PrsAttachmentsPanel({
  requestId,
  canEdit,
  teamId,
  onError,
  highlightRequired = false,
  requiredCategories = [],
}: PrsAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [categories, setCategories] = useState<AttachmentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAreaRef = useRef<HTMLDivElement>(null);

  // Load attachments on mount and when requestId changes
  useEffect(() => {
    if (requestId) {
      loadAttachments();
    }
  }, [requestId]);

  // Load categories when teamId is available
  useEffect(() => {
    if (teamId && canEdit) {
      loadCategories();
    }
  }, [teamId, canEdit]);

  const loadAttachments = async () => {
    if (!requestId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await prsApi.getRequestAttachments(requestId);
      setAttachments(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'خطا در بارگذاری فایل‌ها';
      setError(errorMessage);
      onError?.(errorMessage);
      logger.error('Error loading attachments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    if (!teamId) return;

    try {
      setIsLoadingCategories(true);
      const data = await prsApi.getAttachmentCategories(teamId);
      setCategories(data);
    } catch (err: any) {
      // Categories are optional, so we don't show error to user
      logger.error('Error loading attachment categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
    
    if (!allowedExtensions.includes(fileExtension)) {
      const errorMsg = 'فرمت فایل مجاز نیست. فرمت‌های مجاز: PDF, JPG, PNG, DOCX';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Validate file size (10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const errorMsg = 'حجم فایل نمی‌تواند بیشتر از 10 مگابایت باشد';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setSelectedFile(file);
    setError(null);
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Reset input value to allow selecting the same file again
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canEdit && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!canEdit || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !requestId) return;

    try {
      setIsUploading(true);
      setError(null);

      const uploadData = {
        file: selectedFile,
        category_id: selectedCategoryId || null,
      };

      const attachment = await prsApi.uploadAttachment(requestId, uploadData);
      setAttachments((prev) => [...prev, attachment]);
      setSelectedFile(null);
      setSelectedCategoryId('');
      setError(null);
      // Clear error in parent if callback provided
      if (onError) {
        onError('');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'خطا در آپلود فایل';
      setError(errorMessage);
      onError?.(errorMessage);
      logger.error('Error uploading attachment:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!requestId) return;

    if (!confirm('آیا از حذف این فایل اطمینان دارید؟')) {
      return;
    }

    try {
      await prsApi.deleteAttachment(requestId, attachmentId);
      setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
      setError(null);
      // Clear error in parent if callback provided
      if (onError) {
        onError('');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'خطا در حذف فایل';
      setError(errorMessage);
      onError?.(errorMessage);
      logger.error('Error deleting attachment:', err);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatFileType = (fileType: string): string => {
    const typeMap: Record<string, string> = {
      'application/pdf': 'PDF',
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    };
    return typeMap[fileType] || fileType.split('/').pop()?.toUpperCase() || 'Unknown';
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('fa-IR');
    } catch {
      return dateString;
    }
  };

  return (
    <Box
      sx={{
        mb: 4,
        border: highlightRequired ? `2px solid ${defaultColors.error?.[500] || '#f44336'}` : 'none',
        borderRadius: 2,
        p: highlightRequired ? 2 : 0,
        bgcolor: highlightRequired ? (defaultColors.error?.[50] || '#ffebee') : 'transparent',
      }}
    >
      <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
        فایل‌های پیوست
      </Typography>

      {/* Required attachments warning */}
      {highlightRequired && requiredCategories.length > 0 && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: defaultColors.error?.[100] || '#ffcdd2',
            borderRadius: 1,
            border: `1px solid ${defaultColors.error?.[300] || '#e57373'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
          }}
        >
          <AlertCircle className="w-5 h-5" color={defaultColors.error?.[600] || '#d32f2f'} style={{ marginTop: 2, flexShrink: 0 }} />
          <Box>
            <Typography variant="body1" fontWeight={600} color="error" sx={{ mb: 1 }}>
              اسناد اجباری بارگذاری نشده‌اند
            </Typography>
            <Typography variant="body2" color="text.secondary">
              دسته‌های اجباری زیر باید حداقل یک فایل داشته باشند:
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {requiredCategories.map((categoryName, index) => (
                <Chip
                  key={index}
                  label={categoryName}
                  size="small"
                  sx={{
                    bgcolor: defaultColors.error?.[200] || '#ef9a9a',
                    color: defaultColors.error?.[800] || '#c62828',
                    fontWeight: 600,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Error message */}
      {error && (
        <Box sx={{ p: 2, bgcolor: '#fee', borderRadius: 1, mb: 2 }}>
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        </Box>
      )}

      {/* Upload area (only when canEdit) */}
      {canEdit && (
        <Box sx={{ mb: 3 }}>
          <Box
            ref={uploadAreaRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: 3,
              border: `2px dashed ${isDragging ? (defaultColors.primary?.main || '#1976d2') : defaultColors.neutral[300]}`,
              borderRadius: 2,
              bgcolor: isDragging ? (defaultColors.primary?.light || '#e3f2fd') : defaultColors.neutral[50],
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              mb: 2,
            }}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              disabled={isUploading}
            />
            <Upload className="w-8 h-8" color={defaultColors.neutral[600]} style={{ margin: '0 auto 8px' }} />
            <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>
              {isDragging ? 'فایل را رها کنید' : 'فایل را اینجا بکشید یا کلیک کنید'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              فرمت‌های مجاز: PDF, JPG, PNG, DOCX (حداکثر 10 مگابایت)
            </Typography>
          </Box>

          {/* Selected file and category selector */}
          {selectedFile && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                bgcolor: defaultColors.neutral[50],
                borderRadius: 1,
                border: `1px solid ${defaultColors.neutral[200]}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <FileText className="w-5 h-5" color={defaultColors.neutral[600]} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" fontWeight={600}>
                    {selectedFile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileSize(selectedFile.size)}
                  </Typography>
                </Box>
                <Button
                  variant="text"
                  color="error"
                  buttonSize="S"
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedCategoryId('');
                  }}
                >
                  حذف
                </Button>
              </Box>

              {/* Category selector (if categories available) */}
              {categories.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Select
                    fullWidth
                    height={40}
                    label="دسته‌بندی (اختیاری)"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    size="small"
                  >
                    <MenuItem value="">بدون دسته‌بندی</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name} {category.required && '(اجباری)'}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                buttonSize="M"
                startIcon={isUploading ? <CircularProgress size={16} /> : <Upload className="w-5 h-5" />}
                onClick={handleUpload}
                disabled={isUploading}
                fullWidth
              >
                {isUploading ? 'در حال آپلود...' : 'آپلود فایل'}
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Attachments list */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : attachments.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          هیچ فایلی آپلود نشده است
        </Typography>
      ) : (
        <Box>
          {attachments.map((attachment) => (
            <Box
              key={attachment.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                mb: 1,
                bgcolor: defaultColors.neutral[50],
                borderRadius: 1,
                border: `1px solid ${defaultColors.neutral[200]}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                <FileText className="w-5 h-5" color={defaultColors.neutral[600]} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body1" fontWeight={600}>
                      {attachment.filename}
                    </Typography>
                    {attachment.category && (
                      <Chip
                        label={attachment.category.name}
                        size="small"
                        sx={{
                          bgcolor: defaultColors.primary?.light || '#e3f2fd',
                          color: defaultColors.primary?.main || '#1976d2',
                          height: 20,
                          fontSize: '0.75rem',
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {formatFileType(attachment.file_type)} • {formatFileSize(attachment.file_size)} •{' '}
                    {attachment.uploaded_by.full_name || 'نامشخص'} • {formatDate(attachment.upload_date)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  buttonSize="S"
                  startIcon={<Download className="w-4 h-4" />}
                  onClick={async () => {
                    try {
                      const blob = await prsApi.downloadAttachment(requestId, attachment.id);
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = attachment.filename;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    } catch (err: any) {
                      const errorMessage = err.response?.data?.detail || err.message || 'خطا در دانلود فایل';
                      setError(errorMessage);
                      onError?.(errorMessage);
                      logger.error('Error downloading attachment:', err);
                    }
                  }}
                >
                  دانلود
                </Button>
                {canEdit && (
                  <IconButton
                    onClick={() => handleDelete(attachment.id)}
                    sx={{ color: 'error.main' }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </IconButton>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

