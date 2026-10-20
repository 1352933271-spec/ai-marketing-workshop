<script setup>
defineProps({ number: String, title: String, description: String })
</script>

<template>
  <el-card shadow="never" class="module-card">
    <span class="module-number">{{ number }}</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <el-tag size="small" type="info" effect="plain">后续作业实现</el-tag>
  </el-card>
</template>
