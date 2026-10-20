<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { createProduct } from '../api/product.js'

const emit = defineEmits(['created'])
const form = reactive({ name: '', audience: '', category: '' })
const fileList = ref([])
const submitting = ref(false)
const allowed = ['image/jpeg', 'image/png', 'image/webp']
const audiences = ['欧美年轻人', '日本上班族', '拉美家庭用户', '东南亚学生']
const categories = ['家居收纳', '3C 配件', '美妆个护', '服饰箱包', '户外运动']

function valid(raw) {
  if (!allowed.includes(raw.type)) { ElMessage.error('仅支持 JPG / PNG / WebP 图片'); return false }
  if (raw.size > 5 * 1024 * 1024) { ElMessage.error('单张图片不能超过 5MB'); return false }
  return true
}

function onChange(file, files) {
  fileList.value = valid(file.raw) ? [...files] : files.filter((entry) => entry.uid !== file.uid)
}

async function submit() {
  if (submitting.value) return
  if (!form.name.trim()) return ElMessage.warning('请填写商品名称')
  if (!fileList.value.length) return ElMessage.warning('请至少选择一张图片')
  if (fileList.value.some((file) => !valid(file.raw))) return
  const data = new FormData()
  Object.entries(form).forEach(([key, value]) => data.append(key, value.trim()))
  fileList.value.forEach((file) => data.append('images', file.raw))
  submitting.value = true
  try {
    const response = await createProduct(data)
    ElMessage.success('上传成功')
    form.name = form.audience = form.category = ''
    fileList.value = []
    emit('created', response.data)
  } catch (error) { ElMessage.error(error.message) }
  finally { submitting.value = false }
}
</script>

<template>
  <el-card class="upload-panel" shadow="never">
    <h2>上传商品素材</h2>
    <p class="panel-description">把商品图片和信息一起存入资产库。</p>
    <el-form :model="form" label-position="top" :disabled="submitting" @submit.prevent="submit">
      <el-form-item label="商品名称" required>
        <el-input v-model="form.name" placeholder="例如：折叠手机支架" maxlength="100" show-word-limit />
      </el-form-item>
      <el-form-item label="目标受众">
        <el-select v-model="form.audience" placeholder="选择或输入目标受众" filterable allow-create clearable>
          <el-option v-for="item in audiences" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="商品品类">
        <el-select v-model="form.category" placeholder="请选择品类" clearable>
          <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="商品图片" required>
        <el-upload v-model:file-list="fileList" class="asset-uploader" drag multiple :auto-upload="false" :limit="5"
          accept=".jpg,.jpeg,.png,.webp" list-type="picture" :on-change="onChange"
          :on-exceed="() => ElMessage.warning('最多上传 5 张图片')" :disabled="submitting">
          <div class="upload-symbol" aria-hidden="true">↑</div>
          <div>将图片拖到此处，或 <em>点击选择</em></div>
          <template #tip><div class="upload-tip">JPG / PNG / WebP · 单张≤5MB · 最多5张<br>第一张将作为商品列表封面</div></template>
        </el-upload>
      </el-form-item>
      <el-button class="save-button" type="primary" :loading="submitting" @click="submit">上传并保存</el-button>
    </el-form>
  </el-card>
</template>
