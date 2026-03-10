from .views import (
    AddItemsToExistingLabelingView,
    ExportImportedItemsCsvView,
    ImportItemsCsvView,
    ListItemsView,
    NextItemView,
)
from django.urls import path

urlpatterns = [
    path('labelings/<int:labeling_id>/import-items-csv/', ImportItemsCsvView.as_view(),name="import-items-csv"),
    path('labelings/<int:labeling_id>/add-items-csv/', AddItemsToExistingLabelingView.as_view(),name="add-items-csv"),
    path('labelings/<int:labeling_id>/imported-items-csv/', ExportImportedItemsCsvView.as_view(),name="export-imported-items-csv"),
    path('labelings/<int:labeling_id>/items/', ListItemsView.as_view(),name='list-items'),
    path('items/<int:labeling_id>/', NextItemView.as_view(),name='next-item'),
]


