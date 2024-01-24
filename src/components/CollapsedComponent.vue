<script setup>
  import { ref } from 'vue'

  defineProps({
    data: {
      type: Object,
      required: true,
    },
  })

  const isCollapsed = ref(true);

  const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
  }

  const renderAnnotatedText = (text) => {
      if (typeof text !== 'string') {
        return '';
      }

      const replaceAnnotation = (content) => {
        const annotationRegex = /\{@(\w+) ((?:[^{}]+|\{[^{}]*\})+)\}/g;
        return text.replace(annotationRegex, (match, type, content) => {
          const contentParts = content.split('|')[0];
          const regex = /\{@(\w+) ((?:[^{}]+|\{[^{}])+)/g;
          const another = contentParts.replace(regex, (match, type, content) => {
            return `<span class="clickable" @click="handleClick('${match}')">${content}</span>`;
          });

          return `<span class="clickable" @click="handleClick('${match}')">${another}</span>`;
        });
      }

      return replaceAnnotation(text);
  }
</script>

<template>
  <div class="collapsed">
    <div class="header" @click="toggleCollapse">
      {{ data.name }}
      <span v-if="isCollapsed">+</span>
      <span v-else>-</span>
    </div>
    <transition name="fade">
      <div v-show="!isCollapsed" class="content">
        <ul>
          <li v-for="e in data.entries">
            <p class="mb-3" v-html="renderAnnotatedText(e)"></p>
            <div v-if="e.type === 'table'" class="mb-8">
              <table class="table-auto">
                <thead>
                  <tr>
                    <th v-for="h in e.colLabels" class="px-4 py-2">{{h}}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in e.rows">
                    <td v-for="c in r" class="border px-4 py-2" v-html="renderAnnotatedText(c)"></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="ml-5 mb-4" v-if="e.type === 'list'">
              <ul>
                <li v-for="l in e.items">
                  <span>
                    <span class="mr-4  text-sky-900 font-bold">{{l.name}}</span>
                    <span v-html="renderAnnotatedText(l.entry)"></span>
                    <span v-if="typeof l === 'string'" v-html="`- ${renderAnnotatedText(l)}`"></span>
                    <ul v-if="l.type === 'item'">
                      <li v-for="i in l.entries">
                        <span v-html="renderAnnotatedText(i)"></span>
                      </li>
                    </ul>
                  </span>
                </li>
              </ul>
            </div>
          </li>
        </ul>
        <slot></slot>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.collapsed {
  border: 1px solid #ccc;
  margin-bottom: 10px;
}

.header {
  padding: 10px;
  background-color: #f0f0f0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
}

.content {
  padding: 10px;
  border-top: 1px solid #ccc;
}
</style>

