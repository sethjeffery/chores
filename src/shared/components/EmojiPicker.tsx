interface EmojiCategory {
  name: string;
  emojis?: string[];
  start?: number;
  end?: number;
}

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  emojiSource: string[];
  categories: EmojiCategory[];
  label?: string;
  id?: string;
}

export default function EmojiPicker({
  value,
  onChange,
  emojiSource,
  categories,
  label = "Choose an Icon",
  id = "emoji-picker",
}: EmojiPickerProps) {
  return (
    <div className="mb-5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {label}
        </label>
      )}
      <div className="overflow-x-auto -mx-6 scrollbar-hide snap-x snap-mandatory">
        <div className="flex pb-1 pt-1">
          {categories.map((category, index) => {
            // Get emojis either from direct list or by slicing the source array
            const emojis =
              category.emojis ||
              (category.start !== undefined && category.end !== undefined
                ? emojiSource.slice(category.start, category.end + 1)
                : []);

            return (
              <div
                key={category.name}
                className={`flex-shrink-0 snap-start pl-6 ${
                  index === categories.length - 1 ? "w-full" : "max-w-sm"
                }`}
              >
                <h4 className="text-xs font-medium text-gray-500 mb-1">
                  {category.name}
                </h4>
                <div className="flex flex-wrap gap-0.5 max-w-[340px]">
                  {emojis.slice(0, 20).map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => onChange(emoji)}
                      className={`text-xl p-1 rounded-lg min-w-[2rem] min-h-[2rem] transition-all flex items-center justify-center ${
                        value === emoji
                          ? "bg-indigo-100 shadow-inner border-2 border-indigo-300"
                          : "hover:bg-gray-100 border-2 border-transparent"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
