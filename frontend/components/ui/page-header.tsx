export function PageHeader({ text, subtext }: { text: string; subtext: string }) {
    return (
        <div>
            <h1 className="text-2xl font-semibold">{text}</h1>
            <p className="text-muted-foreground">{subtext}</p>
        </div>
    );
}
