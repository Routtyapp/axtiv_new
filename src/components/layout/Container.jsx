import { Container as RadixContainer } from '@radix-ui/themes'

const Container = ({ children, size = "4", ...props }) => {
  return (
    <RadixContainer
      size={size}
      {...props}
    >
      {children}
    </RadixContainer>
  )
}

export default Container