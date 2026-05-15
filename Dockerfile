FROM node:20-slim
WORKDIR /workspace
COPY package*.json ./
# 设置 npm 淘宝镜像
RUN npm config set registry https://registry.npmmirror.com
RUN npm install
COPY . .