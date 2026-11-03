<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
const props=defineProps({source:String,streaming:Boolean})
const html=computed(()=>DOMPurify.sanitize(marked.parse(props.source||'')))
</script>
<template><div class="md" :class="{typing:streaming}" v-html="html"></div></template>
<style>
.md{line-height:1.8;overflow-wrap:anywhere;overflow-x:auto}.md table{border-collapse:collapse;width:100%;margin:12px 0}.md th,.md td{border:1px solid #dce5df;padding:8px;text-align:left}.md th{background:#edf4ef}.md.typing>:last-child::after{content:'▍';color:#16765d;animation:blink 1s steps(2) infinite}@keyframes blink{50%{opacity:0}}
</style>
