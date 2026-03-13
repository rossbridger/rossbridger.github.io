"use strict";

async function loadShader(elementID) {
    return fetch(document.getElementById(elementID).src).then(r => r.text());
}

const VERTEX_COUNT = 12;
const RADIUS = 0.5;

let diskIndices = new Uint16Array(3 * VERTEX_COUNT);

// build disk index buffer
for (let i = 0; i < VERTEX_COUNT; i++) {
    diskIndices[3*i] = VERTEX_COUNT;  // center of disk
    diskIndices[3*i+1] = i;             // vertex number i
    diskIndices[3*i+2] = (i+1) % VERTEX_COUNT; // vertex number (i+1);
}

// now vertex buffer
let vertexData = new Float32Array(2*(VERTEX_COUNT + 1));
for (let i = 0; i < VERTEX_COUNT; i++) {
    vertexData[i*2] = Math.cos(i * 2 * Math.PI / VERTEX_COUNT) * RADIUS;
    vertexData[i*2+1] = Math.sin(i * 2 * Math.PI / VERTEX_COUNT) * RADIUS;
}
// center of disk
vertexData[VERTEX_COUNT*2] = 0.0;
vertexData[VERTEX_COUNT*2+1] = 0.0;

// two instances for now:             offset          color
const instanceData = new Float32Array([-0.5, -0.5,    1.0, 0.0, 0.0,
                                       0.5, 0.5, 0.0, 1.0, 0.0,
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
                    { shaderLocation: 0, offset: 0, format: "float32x2" }
                ],
                arrayStride: 8,
                stepMode: "vertex"
            },
            { // Second vertex buffer, for instance offsets.
                attributes: [
                    { shaderLocation: 1, offset: 0, format: "float32x2" },
                    { shaderLocation: 2, offset: 8, format: "float32x3" }
                ],
                arrayStride: 20,
                stepMode: "instance"  // This is an instance attribute.
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
        this.instanceBuffer = this.device.createBuffer({
            size: instanceData.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.uniformBuffer = this.device.createBuffer({
            size: 3 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.indexBuffer = this.device.createBuffer({
            size: diskIndices.byteLength,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
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
        this.device.queue.writeBuffer(this.instanceBuffer, 0, instanceData);
        this.device.queue.writeBuffer(this.indexBuffer, 0, diskIndices);
    }

    updateUniformBuffers() {
        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([0.0, 0.5, 0.0]));
    }

    draw() {
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
        passEncoder.setVertexBuffer(1, this.instanceBuffer); // Attach instance buffer.
        passEncoder.setIndexBuffer(this.indexBuffer, "uint16"); // Attach index buffer.
        passEncoder.setBindGroup(0, this.uniformBindGroup); // Attach bind group.
        passEncoder.drawIndexed(3 * VERTEX_COUNT, 2);
        passEncoder.end();

        this.device.queue.submit([commandEncoder.finish()]);
    }
}
