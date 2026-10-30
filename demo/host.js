// Test host: a real app would return the access token of its signed-in user here.
const params = new URLSearchParams(location.search)
const chat = document.querySelector('synthwerk-chat')
if (!chat) throw new Error('no <synthwerk-chat> on the page')
if (params.has('lang')) chat.setAttribute('lang', params.get('lang'))
if (params.has('signed-in')) chat.getUserToken = () => 'demo-user-token'
