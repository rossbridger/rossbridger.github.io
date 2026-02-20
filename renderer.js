"use strict";

const vertexData = new Float32Array([
    /* coords */     /* color */
    -0.8, -0.6, 1, 0, 0,      // data for first vertex
    0.8, -0.6, 0, 1, 0,      // data for second vertex
    0.0, 0.7, 0, 0, 1       // data for third vertex
]);

const indexData = new Uint32Array([
    0, 1, 2
]);

async function getTextContent(elementID) {
    return fetch(document.getElementById(elementID).src).then(r => r.text());
}

class Renderer {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.context = this.canvas.getContext("webgpu");
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

window.addEventListener("load", async () => {
    let renderer = new Renderer();
    await renderer.init();
    let shaderModule = renderer.createShader(await getTextContent("shader"));
    
    let vertexBufferLayout = [
        {   // One vertex buffer, containing values for two attributes.
            attributes: [
                { shaderLocation: 0, offset: 0, format: "float32x2" },
                { shaderLocation: 1, offset: 8, format: "float32x3" }
            ],
            arrayStride: 20,
            stepMode: "vertex"
        }
    ];

    let uniformBindGroupLayout = renderer.createBindGroupLayout({
        entries: [ // An array of resource specifications.
            {
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: "uniform"
                }
            }
        ]
    });

    let pipelineDescriptor = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "triangle-list"
        },
        layout: renderer.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };
    let pipeline = renderer.createPipeline(pipelineDescriptor);

    let pipelineDescriptorForOutline = {
        vertex: { // Configuration for the vertex shader.
            module: shaderModule,
            entryPoint: "vertexMain",
            buffers: vertexBufferLayout
        },
        fragment: { // Configuration for the fragment shader.
            module: shaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat()
            }]
        },
        primitive: {
            topology: "line-strip"
        },
        layout: renderer.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        }),
        multisample: {  // Sets number of samples for multisampling.
            count: 4,     //  (1 and 4 are currently the only possible values).
        },
    };
    let pipelineForOutline = renderer.createPipeline(pipelineDescriptorForOutline);

    let vertexBuffer = renderer.createBuffer(vertexData.byteLength, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST);
    let indexBuffer = renderer.createBuffer(indexData.byteLength, GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST);
    let uniformBuffer = renderer.createBuffer(3 * 4, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

    let uniformBindGroup = renderer.createBindGroup(uniformBindGroupLayout, [
        {
            binding: 0,
            resource: { buffer: uniformBuffer }
        }
    ]);

    renderer.writeBuffer(vertexBuffer, vertexData);
    renderer.writeBuffer(indexBuffer, indexData);
    let textureForMultisampling = renderer.createTexture(
        [renderer.canvas.width, renderer.canvas.height],
        navigator.gpu.getPreferredCanvasFormat(),
        4,
        GPUTextureUsage.RENDER_ATTACHMENT
    );
    let textureViewForMultisampling = textureForMultisampling.createView();

    // drawing
    let renderPassDescriptor = {
        colorAttachments: [{
            clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
            loadOp: "clear", // Alternative is "load".
            storeOp: "store",  // Alternative is "discard".
            view: textureViewForMultisampling, // Render to multisampling texture.
            resolveTarget: renderer.getCurrentTexture().createView() // Resolve to the canvas.
        }]
    };
    
    renderPassDescriptor.colorAttachments[0].loadOp = "clear";
    renderer.drawIndexed(3, renderPassDescriptor, pipeline, indexBuffer, [vertexBuffer, vertexBuffer], [uniformBindGroup]);
    
    renderPassDescriptor.colorAttachments[0].loadOp = "load";
    renderer.draw(3, renderPassDescriptor, pipelineForOutline, [vertexBuffer, vertexBuffer], [uniformBindGroup]);
    renderer.render();
});
