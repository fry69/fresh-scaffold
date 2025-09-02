import { useSignal, type Signal } from "@preact/signals";
import { Button } from "../components/Button.tsx";
import { useEffect } from "preact/hooks";
import { Head } from "fresh/runtime";

interface CounterProps {
  count: Signal<number>;
}

export default function Counter({ count }: CounterProps) {
  const newTitle = useSignal("Fresh Counter");
  useEffect(() => {
    // make sure we always stay Fresh, even if updated elsewhere
    if (count.value < 1) count.value = 1;
    newTitle.value = count.value + " Fresh Counter" +
      (Math.abs(count.value) === 1 ? "" : "s");
  }, [count.value]);

  return (
    <div class="flex gap-8 py-6">
      <Head>
        <title>{newTitle}</title>
      </Head>
      <Button
        id="decrement"
        onClick={() => count.value = Math.max(1, count.value - 1)}
      >
        -1
      </Button>
      <p class="text-3xl tabular-nums">{count.value}</p>
      <Button id="increment" onClick={() => count.value += 1}>+1</Button>
    </div>
  );
}
