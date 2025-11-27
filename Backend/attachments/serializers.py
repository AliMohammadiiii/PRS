from rest_framework import serializers
from attachments.models import AttachmentCategory, Attachment
from accounts.models import User


class AttachmentCategorySerializer(serializers.ModelSerializer):
    """Serializer for attachment category (read-only)"""
    
    class Meta:
        model = AttachmentCategory
        fields = ['id', 'name', 'required']
        read_only_fields = ['id', 'name', 'required']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user serializer for attachment responses"""
    full_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'full_name']
        read_only_fields = ['id', 'full_name']
    
    def get_full_name(self, obj):
        """Return full name from first_name and last_name"""
        if obj:
            full_name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
            return full_name if full_name else None
        return None


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for attachment read/write operations"""
    category = AttachmentCategorySerializer(read_only=True)
    category_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    file = serializers.FileField(write_only=True, required=True)
    uploaded_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = Attachment
        fields = [
            'id',
            'category',
            'category_id',
            'filename',
            'file_type',
            'file_size',
            'upload_date',
            'uploaded_by',
            'file',
        ]
        read_only_fields = ['id', 'category', 'filename', 'file_type', 'file_size', 'upload_date', 'uploaded_by']
    
    def validate_file(self, value):
        """Validate file type and size"""
        # Check file extension (case-insensitive)
        allowed_extensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'xlsx', 'xls']
        file_extension = value.name.split('.')[-1].lower() if '.' in value.name else ''
        
        if file_extension not in allowed_extensions:
            raise serializers.ValidationError(
                f'Invalid file type. Allowed types: {", ".join(allowed_extensions)}'
            )
        
        # Check file size (10 MB = 10 * 1024 * 1024 bytes)
        max_size = 10 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'File size cannot exceed {max_size / (1024 * 1024)} MB.'
            )
        
        return value
    
    def validate_category_id(self, value):
        """Validate that category belongs to request's team"""
        if value:
            request = self.context.get('request_obj')
            if request:
                try:
                    category = AttachmentCategory.objects.get(
                        id=value,
                        team=request.team,
                        is_active=True
                    )
                except AttachmentCategory.DoesNotExist:
                    raise serializers.ValidationError(
                        'Attachment category not found or does not belong to this request\'s team.'
                    )
        return value
    
    def create(self, validated_data):
        """Create attachment from uploaded file"""
        request_obj = self.context['request_obj']
        user = self.context['request'].user
        file_obj = validated_data.pop('file')
        category_id = validated_data.pop('category_id', None)
        
        # Get category if provided
        category = None
        if category_id:
            category = AttachmentCategory.objects.get(id=category_id)
        
        # Extract file information
        filename = file_obj.name
        file_size = file_obj.size
        
        # Determine file type from content_type or extension
        file_type = file_obj.content_type if hasattr(file_obj, 'content_type') and file_obj.content_type else ''
        if not file_type:
            # Fallback to extension
            extension = filename.split('.')[-1].lower() if '.' in filename else ''
            mime_types = {
                'pdf': 'application/pdf',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'xls': 'application/vnd.ms-excel',
            }
            file_type = mime_types.get(extension, extension)
        
        # Create attachment
        attachment = Attachment.objects.create(
            request=request_obj,
            category=category,
            filename=filename,
            file_path=file_obj,
            file_size=file_size,
            file_type=file_type,
            uploaded_by=user,
        )
        
        return attachment


