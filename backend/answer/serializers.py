from rest_framework import serializers
from .models import Answer, BackgroundAnswer
from item.serializers import ItemSerializer


class AnswerSerializer(serializers.ModelSerializer):
    answer_payload = serializers.DictField()
    item_detail = ItemSerializer(source="item", read_only=True)

    class Meta:
        model = Answer
        fields = [
            'id',
            'labeling',
            'item',
            'item_detail',
            'answered_by',
            'answer_payload',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'answered_by']

    def create(self, validated_data):
        user = self.context["request"].user
        return super().create({**validated_data, "answered_by": user})

    def update(self, instance, validated_data):
        if "item" in validated_data and validated_data["item"].id != instance.item_id:
            raise serializers.ValidationError({
                "item": "Não é permitido trocar o item desta resposta."
            })
        if (
            "labeling" in validated_data
            and validated_data["labeling"].id != instance.labeling_id
        ):
            raise serializers.ValidationError({
                "labeling": "Não é permitido trocar a rotulação desta resposta."
            })
        return super().update(instance, validated_data)

    def validate(self, attrs):
        item = attrs.get("item") or getattr(self.instance, "item", None)
        labeling = attrs.get("labeling") or getattr(self.instance, "labeling", None)
        if item and labeling and item.labeling_id != labeling.id:
            raise serializers.ValidationError({
                "labeling": "A rotulação informada não pertence a este item."
            })
        if not item:
            raise serializers.ValidationError({"item": "Item é obrigatório."})
        if not labeling:
            raise serializers.ValidationError({"labeling": "Rotulação é obrigatória."})
        return super().validate(attrs)


class LabelingAnswerDashboardSerializer(serializers.Serializer):
    pass


class BackgroundAnswerSerializer(serializers.ModelSerializer):
    answer_payload = serializers.DictField()
    user_first_name = serializers.CharField(
        source="answered_by.first_name",
        read_only=True,
    )
    user_last_name = serializers.CharField(
        source="answered_by.last_name",
        read_only=True,
    )
    user_email = serializers.EmailField(
        source="answered_by.email",
        read_only=True,
    )

    class Meta:
        model = BackgroundAnswer
        fields = [
            "id",
            "labeling",
            "answered_by",
            "user_first_name",
            "user_last_name",
            "user_email",
            "answer_payload",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "answered_by",
            "created_at",
            "updated_at",
            "user_first_name",
            "user_last_name",
            "user_email",
        ]

    def create(self, validated_data):
        user = self.context["request"].user
        return super().create({**validated_data, "answered_by": user})


class AnswerDashboardSerializer(serializers.Serializer):
    user_first_name = serializers.CharField()
    user_last_name = serializers.CharField()
    user_email = serializers.EmailField()

    answered_at = serializers.DateTimeField()
    answer_count = serializers.IntegerField()
    answers = serializers.JSONField()
