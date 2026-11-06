interface Props {
    value: string,
    onChange: (value: string) => void;
}

export function DemoSearch({value, onChange}: Props) {
    return(
        <input
        value={value}
        onChange={(event)=> onChange(event.target.value)}
        placeholder="Search Material"
        />
    );
}