"use strict";

const vertexCoords = new Float32Array([
    -0.5, -0.5,
    0.5, -0.5,
    0, 0.5
]);

async function initWebGPU() {

    if (!navigator.gpu) {
        throw Error("WebGPU not supported in this browser.");
    }
    let adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw Error("WebGPU is supported, but couldn't get WebGPU adapter.");
    }

    let device = await adapter.requestDevice();
    let canvas = document.getElementById("canvas");
    let context = canvas.getContext("webgpu");
    context.configure({
        device: device,
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied" // (the alternative is "opaque")
    });

    // Create a shader module from the shader code.
    let shaderModule = device.createShaderModule({ code: shader });

    let vertexBufferLayout = [ // An array of vertex buffer specifications.
        {
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
            arrayStride: 8,
            stepMode: "vertex"
        }
    ];

    let uniformBindGroupLayout = device.createBindGroupLayout({
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
        layout: device.createPipelineLayout({
            bindGroupLayouts: [uniformBindGroupLayout]
        })
    };

    let pipeline = device.createRenderPipeline(pipelineDescriptor);

    // build vertex and uniform buffer
    let vertexBuffer = device.createBuffer({
        size: vertexCoords.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    let uniformBuffer = device.createBuffer({
        size: 3 * 4,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    let uniformBindGroup = device.createBindGroup({
        layout: uniformBindGroupLayout,
        entries: [
            {
                binding: 0, // Corresponds to the binding 0 in the layout.
                resource: { buffer: uniformBuffer, offset: 0, size: 3 * 4 }
            }
        ]
    });

    device.queue.writeBuffer(vertexBuffer, 0, vertexCoords);

    // drawing
    let commandEncoder = device.createCommandEncoder();
    let renderPassDescriptor = {
        colorAttachments: [{
            clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 1 },  // gray background
            loadOp: "clear", // Alternative is "load".
            storeOp: "store",  // Alternative is "discard".
            view: context.getCurrentTexture().createView()  // Draw to the canvas.
        }]
    };

    let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(pipeline);            // Specify pipeline.
    passEncoder.setVertexBuffer(0, vertexBuffer);  // Attach vertex buffer.
    passEncoder.setBindGroup(0, uniformBindGroup); // Attach bind group.
    passEncoder.draw(3);                          // Generate vertices.
    passEncoder.end();

    let commandBuffer = commandEncoder.finish();
    device.queue.submit([commandBuffer]);
}

window.addEventListener("load", async () => {
    await initWebGPU();
});