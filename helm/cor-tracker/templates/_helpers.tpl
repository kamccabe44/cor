{{- define "cor-tracker.name" -}}
cor-tracker
{{- end -}}

{{- define "cor-tracker.labels" -}}
app.kubernetes.io/name: {{ include "cor-tracker.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "cor-tracker.selectorLabels" -}}
app.kubernetes.io/name: {{ include "cor-tracker.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
