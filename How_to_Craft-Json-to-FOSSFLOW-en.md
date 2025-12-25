# How to Create Correct JSON for FossFLOW

## Introduction

FossFLOW supports two main diagram formats:
1. **Full JSON format** - detailed export with all data
2. **Compact format** - minimalist format for stable import

**Recommendation:** Use **compact format** - it's more reliable and easier to create.

## 1. Compact Format (Recommended)

### Compact Format Structure

```json
{
  "t": "Diagram Title",
  "i": [
    ["Element Name 1", "icon", "description"],
    ["Element Name 2", "icon", "description"]
  ],
  "v": [
    [
      [[element_index, x, y], [element_index, x, y]],
      [[from_index, to_index], [from_index, to_index]]
    ]
  ],
  "_": {
    "f": "compact",
    "v": "1.0"
  }
}
```

### Simple Diagram Example

```json
{
  "t": "Web Application",
  "i": [
    ["User", "user", "Website visitor"],
    ["Web Server", "server", "Nginx/Apache"],
    ["Database", "storage", "PostgreSQL"]
  ],
  "v": [
    [
      [[0, 1, 4], [1, 3, 2], [2, 5, 2]],
      [[0, 1], [1, 2]]
    ]
  ],
  "_": {
    "f": "compact",
    "v": "1.0"
  }
}
```

## 2. Full JSON Format

### Full Format Structure

```json
{
  "name": "Diagram Title",
  "version": "1.0",
  "exportDate": "2025-12-25T12:00:00.000Z",
  "data": {
    "title": "Diagram Title",
    "items": [
      {
        "id": "unique_id",
        "name": "Element Name",
        "icon": "icon",
        "description": "Description"
      }
    ],
    "views": [
      {
        "id": "view_id",
        "name": "View Name",
        "items": [
          {
            "id": "item_id",
            "tile": {"x": 1, "y": 2}
          }
        ],
        "connectors": [
          {
            "id": "conn_id",
            "anchors": [
              {"id": "a1", "ref": {"item": "item_id_1"}},
              {"id": "a2", "ref": {"item": "item_id_2"}}
            ]
          }
        ]
      }
    ],
    "colors": [
      {"id": "color1", "value": "#0066cc"}
    ],
    "icons": []
  }
}
```

## 3. Valid Icons

### ISOFLOW Collection (37 icons) - PRIMARY
```
block, cache, cardterminal, cloud, cronjob, cube, desktop, diamond,
dns, document, firewall, function-module, image, laptop, loadbalancer,
lock, mail, mailmultiple, mobiledevice, office, package-module,
paymentcard, plane, printer, pyramid, queue, router, server,
speech, sphere, storage, switch-module, tower, truck, truck-2,
user, vm
```

### AWS Collection (320 icons)
Prefix: `aws-`
Examples: `aws-ec2`, `aws-s3`, `aws-lambda`, `aws-rds`

### Azure Collection (369 icons)
Prefix: `azure-`
Examples: `azure-vm`, `azure-storage`, `azure-functions`

### GCP Collection
Prefix: `gcp-`
Examples: `gcp-compute-engine`, `gcp-cloud-storage`

### Kubernetes Collection
Prefix: `k8s-`
Examples: `k8s-pod`, `k8s-service`, `k8s-deployment`

## 4. Working Tools

### Validation
```bash
# Full structure validation
node validator.js your-file.json

# Icon validation only
node check-icons.js your-file.json
```

### Format Conversion
```bash
# From full to compact
node convert-to-compact.js full.json compact.json

# From compact to full
node test-compact-import.js compact.json full.json
```

## 5. Common Errors and Fixes

### Error: "Invalid field"
**Cause:** Extra fields in JSON
**Solution:** Remove fields not specified in the schema

### Error: "Icon not found"
**Cause:** Using invalid icon
**Solution:** Replace with an icon from the list above

**Common replacements:**
- `web_app` → `server`
- `load_balancer` → `loadbalancer`
- `microservice` → `server`
- `redis` → `storage`
- `cdn` → `server`
- `shield` → `server`

### Error: "Model item not found in view"
**Cause:** View references non-existent item
**Solution:** Check ID correspondence in `data.items` and `data.views[*].items`

## 6. Best Practices

### For Reliability:
1. **Use only ISOFLOW icons** - they always work
2. **Validate JSON before import** with validators
3. **Use compact format** for import
4. **Keep coordinates within reasonable limits** (x, y from -10 to 10)

### For Readability:
1. Use clear element names
2. Add descriptions for complex components
3. Group related elements together

## 7. Ready Diagram Examples

### Web Infrastructure (Compact Format)
```json
{
  "t": "Website Infrastructure",
  "i": [
    ["User", "user", "Website visitor"],
    ["Internet", "server", "Global network"],
    ["DNS", "dns", "Domain names"],
    ["CDN", "server", "Content Delivery Network"],
    ["Firewall", "firewall", "Threat protection"],
    ["Load Balancer", "loadbalancer", "Load distribution"],
    ["Web Server", "server", "Nginx/Apache server"],
    ["App Server", "server", "Backend application"],
    ["Database", "storage", "PostgreSQL"],
    ["Cache", "storage", "Redis"]
  ],
  "v": [
    [
      [[0,1,6], [1,3,6], [2,5,6], [3,7,4], [4,7,8], [5,9,6], [6,11,4], [7,13,6], [8,15,6], [9,15,2]],
      [[0,1], [1,2], [1,3], [1,4], [2,5], [3,5], [4,5], [5,6], [5,7], [6,7], [7,8], [7,9]]
    ]
  ],
  "_": {"f": "compact", "v": "1.0"}
}
```

## 8. Testing

### Local Testing
```bash
# Start FossFLOW
npm run dev

# Validate file
node validator.js your-diagram.json
node check-icons.js your-diagram.json

# Open test page
python3 -m http.server 8080
# Go to http://localhost:8080/test-diagram-import.html
```

### Online Testing
1. Open FossFLOW in browser
2. Click "Import"
3. Select your JSON file
4. Diagram should load without errors

## 9. Useful Links

- **FossFLOW:** http://localhost:3002 (after startup)
- **Test Page:** http://localhost:8080/test-diagram-import.html
- **Icons:** See `icon-list-generation-guide.md` in FossFLOW folder
- **Schema:** `fossflow-schema.json` for full format

## Conclusion

To create working FossFLOW diagrams:
1. Use compact format
2. Check icons from ISOFLOW collection
3. Validate JSON before import
4. Test import in FossFLOW

By following these rules, your diagrams will open stably and without errors! 🚀
