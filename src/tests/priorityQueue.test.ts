import { describe, it, expect } from "vitest";
import { PriorityQueue } from "../core/utils/priorityQueue";

describe("PriorityQueue", () => {
  it("debe ordenar los elementos por prioridad", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    queue.enqueue(5);
    queue.enqueue(2);
    queue.enqueue(8);
    queue.enqueue(1);

    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(8);
  });

  it("peek debe mostrar el elemento menor sin eliminarlo", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    queue.enqueue(5);
    queue.enqueue(2);
    queue.enqueue(8);

    expect(queue.peek()).toBe(2);
    expect(queue.size).toBe(3);
  });

  it("dequeue debe eliminar el elemento de mayor prioridad", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    queue.enqueue(10);
    queue.enqueue(3);
    queue.enqueue(7);

    expect(queue.dequeue()).toBe(3);
    expect(queue.size).toBe(2);
    expect(queue.peek()).toBe(7);
  });

  it("size debe actualizarse correctamente", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    expect(queue.size).toBe(0);

    queue.enqueue(4);
    queue.enqueue(6);

    expect(queue.size).toBe(2);

    queue.dequeue();

    expect(queue.size).toBe(1);
  });

  it("debe funcionar cuando la cola está vacía", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    expect(queue.isEmpty()).toBe(true);
    expect(queue.peek()).toBeUndefined();
    expect(queue.dequeue()).toBeUndefined();
    expect(queue.size).toBe(0);
  });

  it("isEmpty debe cambiar al insertar y eliminar elementos", () => {
    const queue = new PriorityQueue<number>((a, b) => a - b);

    expect(queue.isEmpty()).toBe(true);

    queue.enqueue(10);

    expect(queue.isEmpty()).toBe(false);

    queue.dequeue();

    expect(queue.isEmpty()).toBe(true);
  });
});
