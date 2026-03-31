from django.contrib import admin

from .models import Labeling, LabelingSection, LabelingElement, MultipleChoiceItem, QuestionRange, LabelingMembership

admin.site.register(Labeling)
admin.site.register(LabelingSection)    
admin.site.register(LabelingElement)
admin.site.register(MultipleChoiceItem)
admin.site.register(QuestionRange)
admin.site.register(LabelingMembership)
