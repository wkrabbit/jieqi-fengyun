import tkinter as tk
from tkinter import messagebox
from enum import Enum, auto


class Mode(Enum):
    WORK = auto()
    SHORT_BREAK = auto()
    LONG_BREAK = auto()


DEFAULT_TIMES = {
    Mode.WORK: 25 * 60,
    Mode.SHORT_BREAK: 5 * 60,
    Mode.LONG_BREAK: 15 * 60,
}

MODE_LABELS = {
    Mode.WORK: "工作中",
    Mode.SHORT_BREAK: "短休息",
    Mode.LONG_BREAK: "长休息",
}

MODE_COLORS = {
    Mode.WORK: "#e74c3c",
    Mode.SHORT_BREAK: "#2ecc71",
    Mode.LONG_BREAK: "#3498db",
}

WORK_SESSIONS_BEFORE_LONG_BREAK = 4


class PomodoroApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("番茄钟")
        self.root.geometry("360x340")
        self.root.resizable(False, False)
        self.root.configure(bg="#fafafa")

        # State
        self.mode = Mode.WORK
        self.times = dict(DEFAULT_TIMES)
        self.remaining = self.times[Mode.WORK]
        self.running = False
        self.completed_sessions = 0
        self.after_id = None

        self._build_ui()
        self._update_display()

    def _build_ui(self):
        # Title
        self.title_label = tk.Label(
            self.root, text="🍅 番茄钟", font=("Microsoft YaHei", 16, "bold"),
            bg="#fafafa", fg="#333"
        )
        self.title_label.pack(pady=(20, 8))

        # Timer display
        self.timer_label = tk.Label(
            self.root, text="25:00", font=("Consolas", 48, "bold"),
            bg="#fafafa", fg=MODE_COLORS[Mode.WORK]
        )
        self.timer_label.pack(pady=(4, 0))

        # Mode indicator
        self.mode_label = tk.Label(
            self.root, text="工作中", font=("Microsoft YaHei", 11),
            bg="#fafafa", fg="#666"
        )
        self.mode_label.pack(pady=(2, 8))

        # Round counter
        self.round_label = tk.Label(
            self.root, text="第 1 轮", font=("Microsoft YaHei", 10),
            bg="#fafafa", fg="#999"
        )
        self.round_label.pack(pady=(0, 12))

        # Buttons
        btn_frame = tk.Frame(self.root, bg="#fafafa")
        btn_frame.pack()

        btn_style = {
            "font": ("Microsoft YaHei", 10),
            "width": 8,
            "relief": "flat",
            "bd": 0,
            "padx": 6,
            "pady": 4,
        }

        self.start_btn = tk.Button(
            btn_frame, text="开始", command=self.start,
            bg="#e74c3c", fg="white", activebackground="#c0392b",
            activeforeground="white", **btn_style
        )
        self.start_btn.pack(side=tk.LEFT, padx=3)

        self.pause_btn = tk.Button(
            btn_frame, text="暂停", command=self.pause,
            bg="#f39c12", fg="white", activebackground="#d68910",
            activeforeground="white", state=tk.DISABLED, **btn_style
        )
        self.pause_btn.pack(side=tk.LEFT, padx=3)

        self.reset_btn = tk.Button(
            btn_frame, text="重置", command=self.reset,
            bg="#95a5a6", fg="white", activebackground="#7f8c8d",
            activeforeground="white", **btn_style
        )
        self.reset_btn.pack(side=tk.LEFT, padx=3)

        self.settings_btn = tk.Button(
            btn_frame, text="设置", command=self._open_settings,
            bg="#8e44ad", fg="white", activebackground="#7d3c98",
            activeforeground="white", **btn_style
        )
        self.settings_btn.pack(side=tk.LEFT, padx=3)

        # Progress bar (simple canvas bar)
        self.progress_canvas = tk.Canvas(
            self.root, width=300, height=6, bg="#fafafa",
            highlightthickness=0
        )
        self.progress_canvas.pack(pady=(16, 10))
        self.progress_bar = self.progress_canvas.create_rectangle(
            0, 0, 300, 6, fill=MODE_COLORS[Mode.WORK], outline=""
        )

        # Quit hint
        tk.Label(
            self.root, text="关闭窗口即可退出", font=("Microsoft YaHei", 8),
            bg="#fafafa", fg="#ccc"
        ).pack()

    def start(self):
        if not self.running:
            self.running = True
            self.start_btn.config(state=tk.DISABLED)
            self.pause_btn.config(state=tk.NORMAL)
            self._tick()

    def pause(self):
        if self.running:
            self.running = False
            self.start_btn.config(text="继续", state=tk.NORMAL)
            self.pause_btn.config(state=tk.DISABLED)
            if self.after_id:
                self.root.after_cancel(self.after_id)
                self.after_id = None

    def reset(self):
        self.running = False
        if self.after_id:
            self.root.after_cancel(self.after_id)
            self.after_id = None
        self.remaining = self.times[self.mode]
        self.start_btn.config(text="开始", state=tk.NORMAL)
        self.pause_btn.config(state=tk.DISABLED)
        self._update_display()

    def _tick(self):
        if not self.running:
            return
        if self.remaining > 0:
            self.remaining -= 1
            self._update_display()
            self.after_id = self.root.after(1000, self._tick)
        else:
            self.running = False
            self.after_id = None
            self._on_timer_end()

    def _on_timer_end(self):
        # Flash the window
        try:
            self.root.attributes("-topmost", True)
            self.root.after(300, lambda: self.root.attributes("-topmost", False))
        except Exception:
            pass

        self.root.bell()

        if self.mode == Mode.WORK:
            self.completed_sessions += 1
            next_mode = (
                Mode.LONG_BREAK
                if self.completed_sessions % WORK_SESSIONS_BEFORE_LONG_BREAK == 0
                else Mode.SHORT_BREAK
            )
            msg = (
                f"完成 {self.completed_sessions} 个番茄钟！\n"
                f"休息一下 {'(长休息)' if next_mode == Mode.LONG_BREAK else ''}吧~"
            )
        else:
            next_mode = Mode.WORK
            msg = "休息结束，开始新的番茄钟！"

        messagebox.showinfo(
            "番茄钟提醒",
            msg,
            parent=self.root,
        )

        self.mode = next_mode
        self.remaining = self.times[self.mode]
        self.start_btn.config(text="开始", state=tk.NORMAL)
        self.pause_btn.config(state=tk.DISABLED)
        self._update_display()

    def _update_display(self):
        minutes = self.remaining // 60
        seconds = self.remaining % 60
        self.timer_label.config(
            text=f"{minutes:02d}:{seconds:02d}",
            fg=MODE_COLORS[self.mode],
        )
        self.mode_label.config(text=MODE_LABELS[self.mode])

        current_round = self.completed_sessions + 1
        self.round_label.config(text=f"第 {current_round} 轮")

        # Update progress bar
        total = self.times[self.mode]
        if total > 0:
            fraction = self.remaining / total
        else:
            fraction = 0
        bar_width = int(300 * fraction)
        self.progress_canvas.coords(self.progress_bar, 0, 0, bar_width, 6)
        self.progress_canvas.itemconfig(
            self.progress_bar, fill=MODE_COLORS[self.mode]
        )

    def _open_settings(self):
        was_running = self.running
        if was_running:
            self.pause()

        dialog = SettingsDialog(self.root, self.times)
        self.root.wait_window(dialog.top)

        if dialog.result:
            self.times[Mode.WORK] = dialog.result[Mode.WORK] * 60
            self.times[Mode.SHORT_BREAK] = dialog.result[Mode.SHORT_BREAK] * 60
            self.times[Mode.LONG_BREAK] = dialog.result[Mode.LONG_BREAK] * 60
            if not was_running:
                self.remaining = self.times[self.mode]
            self._update_display()

    def run(self):
        self.root.mainloop()


class SettingsDialog:
    def __init__(self, parent, current_times):
        self.result = None
        self.top = tk.Toplevel(parent)
        self.top.title("设置时长")
        self.top.geometry("280x200")
        self.top.resizable(False, False)
        self.top.configure(bg="#fafafa")
        self.top.transient(parent)
        self.top.grab_set()

        self.entries = {}
        labels = [
            ("工作时长（分钟）：", Mode.WORK),
            ("短休息时长（分钟）：", Mode.SHORT_BREAK),
            ("长休息时长（分钟）：", Mode.LONG_BREAK),
        ]

        for i, (text, mode) in enumerate(labels):
            tk.Label(
                self.top, text=text, font=("Microsoft YaHei", 10),
                bg="#fafafa", fg="#333"
            ).grid(row=i, column=0, sticky="e", padx=(20, 4), pady=(14, 0))

            var = tk.StringVar(value=str(current_times[mode] // 60))
            entry = tk.Entry(
                self.top, textvariable=var, font=("Consolas", 11),
                width=6, justify="center", relief="solid", bd=1
            )
            entry.grid(row=i, column=1, sticky="w", padx=(4, 0), pady=(14, 0))
            self.entries[mode] = var

        btn_frame = tk.Frame(self.top, bg="#fafafa")
        btn_frame.grid(row=3, column=0, columnspan=2, pady=(18, 0))

        tk.Button(
            btn_frame, text="保存", command=self._save,
            font=("Microsoft YaHei", 10), width=8,
            bg="#e74c3c", fg="white", activebackground="#c0392b",
            activeforeground="white", relief="flat", bd=0, padx=6, pady=4
        ).pack(side=tk.LEFT, padx=4)

        tk.Button(
            btn_frame, text="取消", command=self.top.destroy,
            font=("Microsoft YaHei", 10), width=8,
            bg="#95a5a6", fg="white", activebackground="#7f8c8d",
            activeforeground="white", relief="flat", bd=0, padx=6, pady=4
        ).pack(side=tk.LEFT, padx=4)

    def _save(self):
        try:
            work = max(1, min(120, int(self.entries[Mode.WORK].get())))
            short = max(1, min(30, int(self.entries[Mode.SHORT_BREAK].get())))
            long_ = max(1, min(60, int(self.entries[Mode.LONG_BREAK].get())))
            self.result = {Mode.WORK: work, Mode.SHORT_BREAK: short, Mode.LONG_BREAK: long_}
            self.top.destroy()
        except ValueError:
            messagebox.showwarning("输入错误", "请输入有效的整数分钟数", parent=self.top)


if __name__ == "__main__":
    app = PomodoroApp()
    app.run()
