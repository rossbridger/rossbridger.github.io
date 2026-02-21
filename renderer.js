"use strict";

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext("webgpu");
    }
    async init(format = null, alphaMode = "premultiplied") {
        if (!navigator.gpu) {
            throw Error("WebGPU not supported in this browser.");
        }
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw Error("WebGPU is supported, but couldn't get WebGPU adapter.");
        }

        this.device = await this.adapter.requestDevice();
        this.context.configure({
            device: this.device,
            format: format || navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: alphaMode
        });
        
        this.commandEncoder = this.device.createCommandEncoder();
    }

    createShader(code) {
        return this.device.createShaderModule({code: code});
    }

    createBindGroupLayout(entries) {
        return this.device.createBindGroupLayout(entries);
    }

    createBindGroup(layout, entries) {
        return this.device.createBindGroup({layout: layout, entries: entries});
    }

    createPipelineLayout(descriptor) {
        return this.device.createPipelineLayout(descriptor);
    }

    createPipeline(descriptor) {
        return this.device.createRenderPipeline(descriptor);
    }

    createBuffer(size, usage) {
        return this.device.createBuffer({
            size: size,
            usage: usage
        });
    }

    createTexture(size, format, sampleCount, usage) {
        return this.device.createTexture({
            size: size,
            format: format,
            sampleCount: sampleCount,
            usage: usage
        });
    }

    writeBuffer(buffer, data) {
        this.device.queue.writeBuffer(buffer, 0, data);
    }

    getCurrentTexture() {
        return this.context.getCurrentTexture();
    }

    draw(vertexCount, renderPassDescriptor, pipeline, vertexBuffers, bindGroups) {
        let passEncoder = this.commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        for (let i = 0; i < vertexBuffers.length; i++) {
            passEncoder.setVertexBuffer(i, vertexBuffers[i]);
        }
        for (let i = 0; i < bindGroups.length; i++) {
            passEncoder.setBindGroup(i, bindGroups[i]);
        }
        passEncoder.draw(vertexCount);
        passEncoder.end();
    }

    drawIndexed(indexCount, renderPassDescriptor, pipeline, indexBuffer, vertexBuffers, bindGroups) {
        let passEncoder = this.commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        for (let i = 0; i < vertexBuffers.length; i++) {
            passEncoder.setVertexBuffer(i, vertexBuffers[i]);
        }
        passEncoder.setIndexBuffer(indexBuffer, "uint32");
        for (let i = 0; i < bindGroups.length; i++) {
            passEncoder.setBindGroup(i, bindGroups[i]);
        }
        passEncoder.drawIndexed(indexCount);
        passEncoder.end();
    }

    render() {
        let commandBuffer = this.commandEncoder.finish();
        this.device.queue.submit([commandBuffer]);
        requestAnimationFrame(() => this.render());
    }
}
