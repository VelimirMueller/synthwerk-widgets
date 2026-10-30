// Test host: a real app would return the access token of its signed-in user here.
const params = new URLSearchParams(location.search)
const widgets = document.querySelectorAll('synthwerk-chat, synthwerk-vision')
if (widgets.length === 0) throw new Error('no Synthwerk widget on the page')
for (const widget of widgets) {
  if (params.has('lang')) widget.setAttribute('lang', params.get('lang'))
  if (params.has('save-photos') && widget.localName === 'synthwerk-vision') {
    widget.setAttribute('save-photos', '')
  }
  if (params.has('signed-in')) widget.getUserToken = () => 'demo-user-token'
}
