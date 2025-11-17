from .views import ImportItemsCsvView, ListItemsView
from django.urls import path

urlpatterns = [
    path('labelings/<int:labeling_id>/import-items-csv/', ImportItemsCsvView.as_view(),name="import-items-csv"),
    path('labelings/<int:labeling_id>/items/', ListItemsView.as_view(),name='list-items')
]


