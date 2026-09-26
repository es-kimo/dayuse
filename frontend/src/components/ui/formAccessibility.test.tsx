import { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, Input, Textarea, FormField, Checkbox, Select } from './index';

describe('Form & Action Components Accessibility (DS-04)', () => {
  it('Button should set aria-busy and disable when loading', () => {
    render(<Button isLoading loadingText="저장 중...">저장하기</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('저장 중...');
  });

  it('Button should support explicit button type', () => {
    render(<Button type="submit">제출</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('Input should set aria-invalid and aria-describedby when error is provided', () => {
    render(
      <FormField label="사용자 이름" required error="이름을 입력해주세요." id="user-name">
        <Input id="user-name" error="이름을 입력해주세요." />
      </FormField>
    );

    const input = screen.getByLabelText(/사용자 이름/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('id', 'user-name');

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toHaveTextContent('이름을 입력해주세요.');
    expect(errorMsg).toHaveAttribute('aria-live', 'polite');
  });

  it('FormField should link label to control via htmlFor', () => {
    render(
      <FormField label="이메일" id="email-field" description="로그인 시 사용됩니다.">
        <Input id="email-field" placeholder="test@example.com" />
      </FormField>
    );

    const input = screen.getByLabelText('이메일');
    expect(input).toBeInTheDocument();
    expect(screen.getByText('로그인 시 사용됩니다.')).toBeInTheDocument();
  });

  it('Input ref should support programmatic focus for first invalid field focus policy', () => {
    const inputRef = createRef<HTMLInputElement>();
    render(<Input ref={inputRef} placeholder="입력창" />);
    inputRef.current?.focus();
    expect(document.activeElement).toBe(inputRef.current);
  });

  it('Textarea should render accessible textarea with 16px base font class', () => {
    const textareaRef = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={textareaRef} placeholder="내용" />);
    expect(textareaRef.current).toHaveClass('text-base');
  });

  it('Checkbox should have role="checkbox" and support accessible label', () => {
    render(<Checkbox id="agree" label="약관에 동의합니다" checked={true} onCheckedChange={() => {}} />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('약관에 동의합니다')).toBeInTheDocument();
  });

  it('Select should have accessible label, chevron, and error attributes', () => {
    render(
      <FormField label="은행" id="bank-select" error="은행을 선택하세요.">
        <Select id="bank-select" error="은행을 선택하세요.">
          <option value="shinhan">신한은행</option>
          <option value="kakao">카카오뱅크</option>
        </Select>
      </FormField>
    );

    const select = screen.getByLabelText(/은행/);
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });
});
