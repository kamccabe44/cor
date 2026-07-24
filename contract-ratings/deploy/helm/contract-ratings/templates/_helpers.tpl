{{/*
Chart name (overridable).
*/}}
{{- define "contract-ratings.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Fullname used for all resources. Prefer an explicit override, then the clean
per-tenant name `cor-<tenant>`, then the standard <release>-<chart> fallback.
*/}}
{{- define "contract-ratings.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else if .Values.tenant -}}
{{- printf "cor-%s" .Values.tenant | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "contract-ratings.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/*
Secret holding the shared password (+ optional session secret).
*/}}
{{- define "contract-ratings.authSecretName" -}}
{{- printf "%s-auth" (include "contract-ratings.fullname" .) -}}
{{- end -}}

{{/*
TLS secret cert-manager writes the issued certificate into.
*/}}
{{- define "contract-ratings.tlsSecretName" -}}
{{- default (printf "%s-tls" (include "contract-ratings.fullname" .)) .Values.ingress.tlsSecretName -}}
{{- end -}}

{{/*
Common labels.
*/}}
{{- define "contract-ratings.labels" -}}
app.kubernetes.io/name: {{ include "contract-ratings.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" }}
{{- if .Values.tenant }}
cor.osalerts.io/tenant: {{ .Values.tenant | quote }}
{{- end }}
{{- end -}}

{{/*
Selector labels (stable across upgrades).
*/}}
{{- define "contract-ratings.selectorLabels" -}}
app.kubernetes.io/name: {{ include "contract-ratings.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
