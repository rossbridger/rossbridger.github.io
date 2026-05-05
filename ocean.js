"use strict";

import { RenderItem, Renderer } from "./renderer.js";
import { mat4 } from 'https://wgpu-matrix.org/dist/3.x/wgpu-matrix.module.js';

export class Ocean extends RenderItem {
    constructor(renderer) {
        super(renderer, "ocean");

        this.shader = null;
        this.pipeline = null;
        this.uniformBindGroup = null;
        this.vertexBuffer = null;
        this.vertexBufferLayout = null;
        this.indexBuffer = null;
        this.modelMatrix = mat4.identity();
        this.modelUniformBuffer = null;
        this.oceanVertices = null;
        this.oceanIndices = null;
    }
    
    createPipeline() {
        this.vertexBufferLayout = [ // An array of vertex buffer specifications.
            {
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x2" }, // vertex position
                ],
                arrayStride: 8,
                stepMode: "vertex"
            }
        ];

        let pipelineDescriptor = {
            vertex: { // Configuration for the vertex shader.
                module: this.shader,
                entryPoint: "vertexMain",
                buffers: this.vertexBufferLayout
            },
            fragment: { // Configuration for the fragment shader.
                module: this.shader,
                entryPoint: "fragmentMain",
                targets: [{
                    format: navigator.gpu.getPreferredCanvasFormat()
                }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back",
                frontFace: "cw"
            },
            layout: "auto",
            
            multisample: {  // Sets number of samples for multisampling.
                count: 4,     //  (1 and 4 are currently the only possible values).
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
    }

    createOceanMesh() {
        const verticesPerRow = 2049;
        this.oceanVertices = new Float32Array(2 * verticesPerRow * verticesPerRow);
        for (let i = 0; i < verticesPerRow; i++) {
            for (let j = 0; j < verticesPerRow; j++) {
                this.oceanVertices[2 * (j * verticesPerRow + i) + 0] = i - 1024;
                this.oceanVertices[2 * (j * verticesPerRow + i) + 1] = j - 1024;
            }
        }
        // now indices, 3 indices per triangle, 2 triangles per square, 1024 * 1024 squares
        this.oceanIndices = new Uint32Array(6 * (verticesPerRow - 1) * (verticesPerRow - 1));
        for (let i = 0; i < verticesPerRow - 1; i++) {
            for (let j = 0; j < verticesPerRow - 1; j++) {
                const idxNW = j * verticesPerRow + i;
                const idxNE = idxNW + 1;
                const idxSW = idxNW + verticesPerRow;
                const idxSE = idxSW + 1;

                // Triangle 1: NW, NE, SW
                let idx = (j * (verticesPerRow - 1) + i) * 6;
                this.oceanIndices[idx++] = idxNW; // NW
                this.oceanIndices[idx++] = idxNE; // NE
                this.oceanIndices[idx++] = idxSW; // SW
                // Triangle 2: NE, SE, SW
                this.oceanIndices[idx++] = idxNE; // NE
                this.oceanIndices[idx++] = idxSE; // SE
                this.oceanIndices[idx++] = idxSW; // SW
            }
        }
        console.log("Ocean vertices: " + this.oceanVertices.length + ", indices: " + this.oceanIndices.length);
    }
    
    createBindGroups() {
        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: { buffer: this.renderer.viewProjectionUniformBuffer }
                }
            ]
        });
    }

    createBuffers() {
        this.vertexBuffer = this.device.createBuffer({
            size: this.oceanVertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.indexBuffer = this.device.createBuffer({
            size: this.oceanIndices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
        });
    }

    loadBuffers() {
        this.device.queue.writeBuffer(this.vertexBuffer, 0, this.oceanVertices);
        this.device.queue.writeBuffer(this.indexBuffer, 0, this.oceanIndices);
    }

    async init() {
        this.shader = await this.renderer.createShader("ocean");
        this.createOceanMesh();
        this.createPipeline();
        this.createBuffers();
        this.createBindGroups();
        this.loadBuffers();
    }

    onRender(commandEncoder) {
        let renderPassDescriptor = {
            colorAttachments: [{
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
                loadOp: "load", // Alternative is "load".
                storeOp: "store",  // Alternative is "discard".
                view: this.renderer.textureViewForMultisampling, // Render to multisampling texture.
                resolveTarget: this.context.getCurrentTexture().createView() // Final image.
            }],
            depthStencilAttachment: {  // Add depth buffer to the colorAttachment
                view: this.renderer.depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: "clear",
                depthStoreOp: "store",
                resolveTarget: this.context.getCurrentTexture().createView() // Final image.
            }
        };
        let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);            // Specify pipeline.
        passEncoder.setVertexBuffer(0, this.vertexBuffer);  // Attach vertex buffer.
        passEncoder.setIndexBuffer(this.indexBuffer, "uint32");
        passEncoder.setBindGroup(0, this.uniformBindGroup); // Attach bind group.
        passEncoder.drawIndexed(this.oceanIndices.length);
        passEncoder.end();
    }
}
