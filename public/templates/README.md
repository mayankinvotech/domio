# Domio import templates

The wizard's **Download Template** button links to `/templates/Domio_Import_Template.xlsx`
(served from this folder).

⚠️ **The real template file is not committed yet.** Copy it here:

```
public/templates/Domio_Import_Template.xlsx
```

Until that file is placed, the Download Template link will 404. The template's
sheet/column layout is also the contract that the `POST /api/imports/template`
parser (to be built) must match.
