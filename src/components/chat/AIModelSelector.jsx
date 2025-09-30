import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"

const aiModels = [
  {
    value: "gpt-5",
    label: "GPT-5",
    description: "최신 GPT-5 모델",
    provider: "openai"
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description: "빠르고 효율적인 GPT-4",
    provider: "openai"
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    description: "멀티모달 최적화 모델",
    provider: "openai"
  },
  {
    value: "gpt-4",
    label: "GPT-4",
    description: "기본 GPT-4 모델",
    provider: "openai"
  },
  {
    value: "claude-opus-4-1-20250805",
    label: "Claude Opus 4.1",
    description: "가장 강력한 Claude 모델",
    provider: "anthropic"
  },
  {
    value: "claude-sonnet-4-5-20250929",
    label: "Claude Sonnet 4.5",
    description: "최신 Claude Sonnet 모델",
    provider: "anthropic"
  },
  {
    value: "claude-3-7-sonnet-latest",
    label: "Claude 3.7 Sonnet",
    description: "Claude 3.7 Sonnet 최신 버전",
    provider: "anthropic"
  }
]

const AIModelSelector = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false)

  const selectedModel = aiModels.find((model) => model.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          size="lg"
          className="w-[180px] h-11 justify-between"
        >
          {selectedModel ? selectedModel.label : "모델 선택..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="모델 검색..." />
          <CommandList>
            <CommandEmpty>모델을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {aiModels.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={(currentValue) => {
                    onChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === model.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-gray-500">{model.description}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default AIModelSelector