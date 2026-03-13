"use strict";

async function loadShader(elementID) {
    return fetch(document.getElementById(elementID).src).then(r => r.text());
}

const vertexData = new Float32Array([
   /* coords */      /* offset */    /* color */
    -0.8, -0.6,      0.0, 0.0,       1, 0, 0,      // data for first vertex
    0.8, -0.6,       0.0, 0.0,       0, 1, 0,      // data for second vertex
    0.0, 0.7,        0.0, 0.0,       0, 0, 1       // data for third vertex
]);

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext("webgpu");
        this.adapter = null;
        this.device = null;
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
        console.log("WebGPU initialized.")
    }

    async createShaders() {
        let code = await loadShader("shader");
        if (!this.device) {
            throw Error("WebGPU device not initialized.");
        }
        this.shader = this.device.createShaderModule({
            code: code
        });
    }

    createPipeline() {
        this.vertexBufferLayout = [ // An array of vertex buffer specifications.
            {
                attributes: [
                    { shaderLocation: 0, offset: 0, format: "float32x2" },
                    { shaderLocation: 1, offset: 8, format: "float32x2" },
                    { shaderLocation: 2, offset: 16, format: "float32x3" }
                ],
                arrayStride: 28,
                stepMode: "vertex"
            }
        ];

        this.uniformBindGroupLayout = this.device.createBindGroupLayout({
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
                topology: "triangle-list"
            },
            layout: this.device.createPipelineLayout({
                bindGroupLayouts: [this.uniformBindGroupLayout]
            })
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDescriptor);
    }

    createBuffers() {
        this.vertexBuffer = this.device.createBuffer({
            size: vertexData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.uniformBuffer = this.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
    }

    createBindGroups() {
        this.uniformBindGroup = this.device.createBindGroup({
            layout: this.uniformBindGroupLayout,
            entries: [
                {
                    binding: 0, // Corresponds to the binding 0 in the layout.
                    resource: { buffer: this.uniformBuffer, offset: 0, size: 3 * 4 } // Assuming 3 floats for color
                }
            ]
        });
    }

    loadVertexAndIndexBuffers() {
        this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);
    }

    updateUniformBuffers() {
        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([0.0, 0.5, 0.0]));
    }

    buildCommandBuffer() {
        let commandEncoder = this.device.createCommandEncoder();
        let renderPassDescriptor = {
            colorAttachments: [{
                clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
                loadOp: "clear", // Alternative is "load".
                storeOp: "store",  // Alternative is "discard".
                view: this.context.getCurrentTexture().createView()  // Draw to the canvas.
            }]
        };

        let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(this.pipeline);            // Specify pipeline.
        passEncoder.setVertexBuffer(0, this.vertexBuffer);  // Attach vertex buffer.
        passEncoder.setBindGroup(0, this.uniformBindGroup); // Attach bind group.
        passEncoder.draw(3);                          // Generate vertices.
        passEncoder.end();
        this.commandBuffer = commandEncoder.finish();
    }

    draw() {
        this.device.queue.submit([this.commandBuffer]);
    }
}
