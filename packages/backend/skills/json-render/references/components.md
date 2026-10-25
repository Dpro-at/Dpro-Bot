# json-render Component Reference

Full props and examples for all supported components.

## Layout

### Card
```json
{"type":"Card","props":{"title":"My Card","description":"Optional subtitle"},"children":["child-id"]}
```

### Stack
```json
{"type":"Stack","props":{"gap":"md","direction":"vertical"},"children":["a","b","c"]}
```
`direction`: `"vertical"` (default) | `"horizontal"`
`gap`: `"sm"` | `"md"` | `"lg"`

### Grid
```json
{"type":"Grid","props":{"columns":3,"gap":"md"},"children":["a","b","c"]}
```
`columns`: 1, 2, 3, 4

### Separator
```json
{"type":"Separator","props":{},"children":[]}
```

---

## Typography

### Heading
```json
{"type":"Heading","props":{"text":"Section Title","level":"h2"},"children":[]}
```
`level`: `"h1"` | `"h2"` | `"h3"` | `"h4"`

### Text
```json
{"type":"Text","props":{"content":"Some paragraph text","muted":false},"children":[]}
```

### Badge
```json
{"type":"Badge","props":{"text":"Active","variant":"success"},"children":[]}
```
`variant`: `"default"` | `"secondary"` | `"success"` | `"warning"` | `"destructive"`

### Link
```json
{"type":"Link","props":{"text":"Visit site","href":"https://example.com"},"children":[]}
```

---

## Data Display

### Metric
```json
{"type":"Metric","props":{"label":"Revenue","value":"$42K","detail":"vs last month","trend":"up"},"children":[]}
```
`trend`: `"up"` | `"down"` | `"neutral"` — shows colored arrow icon

### Table
```json
{"type":"Table","props":{
  "columns":[{"key":"name","label":"Name"},{"key":"value","label":"Value"},{"key":"status","label":"Status"}],
  "data":[
    {"name":"Alpha","value":100,"status":"active"},
    {"name":"Beta","value":85,"status":"pending"}
  ]
},"children":[]}
```
- Sortable by any column
- `emptyMessage`: custom empty state text

### Callout
```json
{"type":"Callout","props":{"type":"warning","title":"Heads up","content":"Something needs attention"},"children":[]}
```
`type`: `"info"` (blue) | `"tip"` (green) | `"warning"` (amber) | `"important"` (purple)

---

## Rich Content

### Timeline
```json
{"type":"Timeline","props":{"items":[
  {"title":"Deployed v1.3.0","date":"Jan 15","description":"Initial release","status":"completed"},
  {"title":"Deployed v1.1","date":"Feb 1","description":"Bug fixes","status":"current"},
  {"title":"Plan v2.0","date":"Mar 1","description":"Major rewrite","status":"upcoming"}
]},"children":[]}
```
`status`: `"completed"` (green dot) | `"current"` (primary dot) | `"upcoming"` (gray dot)

### Accordion
```json
{"type":"Accordion","props":{"items":[
  {"title":"What is Dpro Bot?","content":"A local AI agent platform."},
  {"title":"How does it work?","content":"Uses Claude or Ollama as the LLM backend."}
]},"children":[]}
```

---

## Charts

### BarChart
```json
{"type":"BarChart","props":{
  "title":"Monthly Sales",
  "data":[
    {"month":"Jan","sales":120},
    {"month":"Feb","sales":150},
    {"month":"Mar","sales":90}
  ],
  "xKey":"month",
  "yKey":"sales",
  "height":250,
  "color":"#6366f1"
},"children":[]}
```

### LineChart
```json
{"type":"LineChart","props":{
  "title":"User Growth",
  "data":[
    {"week":"W1","users":100},
    {"week":"W2","users":140},
    {"week":"W3","users":130},
    {"week":"W4","users":180}
  ],
  "xKey":"week",
  "yKey":"users"
},"children":[]}
```

### PieChart
```json
{"type":"PieChart","props":{
  "title":"Traffic Sources",
  "data":[
    {"source":"Organic","visits":450},
    {"source":"Direct","visits":220},
    {"source":"Social","visits":180},
    {"source":"Referral","visits":90}
  ],
  "nameKey":"source",
  "valueKey":"visits"
},"children":[]}
```

---

## Interactive

### Tabs + TabContent
```json
{"type":"Tabs","props":{"tabs":[{"value":"overview","label":"Overview"},{"value":"details","label":"Details"}]},"children":["tab1","tab2"]}
{"type":"TabContent","props":{"value":"overview"},"children":["overview-content"]}
{"type":"TabContent","props":{"value":"details"},"children":["details-content"]}
```

### Button
```json
{"type":"Button","props":{"label":"Click Me","variant":"default"},"children":[]}
```
`variant`: `"default"` | `"outline"` | `"secondary"`

---

## Complex Example — Full Dashboard

```spec
{"op":"add","path":"/root","value":"root"}
{"op":"add","path":"/elements/root","value":{"type":"Stack","props":{"gap":"lg","direction":"vertical"},"children":["h1","metrics","charts"]}}
{"op":"add","path":"/elements/h1","value":{"type":"Heading","props":{"text":"System Dashboard","level":"h2"},"children":[]}}
{"op":"add","path":"/elements/metrics","value":{"type":"Grid","props":{"columns":3,"gap":"md"},"children":["c1","c2","c3"]}}
{"op":"add","path":"/elements/c1","value":{"type":"Card","props":{"title":"CPU"},"children":["m1"]}}
{"op":"add","path":"/elements/m1","value":{"type":"Metric","props":{"label":"Usage","value":"42%","trend":"neutral"},"children":[]}}
{"op":"add","path":"/elements/c2","value":{"type":"Card","props":{"title":"Memory"},"children":["m2"]}}
{"op":"add","path":"/elements/m2","value":{"type":"Metric","props":{"label":"Used","value":"6.2GB","trend":"up"},"children":[]}}
{"op":"add","path":"/elements/c3","value":{"type":"Card","props":{"title":"Storage"},"children":["m3"]}}
{"op":"add","path":"/elements/m3","value":{"type":"Metric","props":{"label":"Free","value":"128GB","trend":"down"},"children":[]}}
{"op":"add","path":"/elements/charts","value":{"type":"Card","props":{"title":"CPU History"},"children":["chart1"]}}
{"op":"add","path":"/elements/chart1","value":{"type":"LineChart","props":{"data":[{"t":"10:00","v":30},{"t":"10:05","v":45},{"t":"10:10","v":42},{"t":"10:15","v":55},{"t":"10:20","v":38}],"xKey":"t","yKey":"v"},"children":[]}}
```
